import {
  DEFAULT_FEEDBACK_STATUS,
  FEEDBACK_CATEGORIES,
  FEEDBACK_SCOPE_LABEL,
  FEEDBACK_STATUSES,
  getCategoryFromLabels,
  getStatusFromLabels,
  isTerminalStatus,
  type FeedbackCategory,
  type FeedbackStatus,
} from './config';
import { FeedbackError } from './errors';
import { GitHubClient } from './github';
import {
  createIssueBody,
  createPortalCommentBody,
  createVoteBody,
  parseIssueBody,
  parsePortalComment,
  parseVoteToken,
} from './metadata';
import type { CreateCommentInput, CreateFeedbackInput, ListFeedbackInput } from './schemas';
import type {
  FeedbackDetail,
  FeedbackDiscussionComment,
  FeedbackMutationResponse,
  FeedbackSummary,
} from './types';

interface GitHubLabel {
  name: string;
}

interface GitHubUser {
  login: string;
  avatar_url: string;
  html_url: string;
  type: string;
}

interface GitHubIssue {
  number: number;
  title: string;
  body: string | null;
  state: 'open' | 'closed';
  labels: Array<GitHubLabel | string>;
  created_at: string;
  updated_at: string;
  html_url: string;
  user: GitHubUser | null;
  pull_request?: unknown;
}

interface GitHubComment {
  id: number;
  body: string;
  created_at: string;
  html_url: string;
  user: GitHubUser | null;
  author_association:
    | 'COLLABORATOR'
    | 'CONTRIBUTOR'
    | 'FIRST_TIMER'
    | 'FIRST_TIME_CONTRIBUTOR'
    | 'MANNEQUIN'
    | 'MEMBER'
    | 'NONE'
    | 'OWNER';
}

interface IssueProjection {
  issue: GitHubIssue;
  body: string;
  authorName: string;
  labels: string[];
}

function labelNames(issue: GitHubIssue): string[] {
  return issue.labels.map((label) => (typeof label === 'string' ? label : label.name));
}

function excerpt(value: string): string {
  const compact = value.replace(/\s+/gu, ' ').trim();
  return compact.length > 180 ? `${compact.slice(0, 177).trimEnd()}...` : compact;
}

async function mapWithConcurrency<T, R>(
  items: readonly T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(items[index]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
  return results;
}

export class GitHubFeedbackRepository {
  private readonly client: GitHubClient;
  private readonly repositoryPath: string;
  private readonly appBotLogin: string;

  constructor(private readonly env: Cloudflare.Env) {
    this.client = new GitHubClient(env);
    const owner = env.GITHUB_REPOSITORY_OWNER || 'excalimate';
    const repository = env.GITHUB_REPOSITORY_NAME || 'excalimate';
    this.repositoryPath = `/repos/${owner}/${repository}`;
    if (!env.GITHUB_APP_BOT_LOGIN) {
      throw new FeedbackError(
        503,
        'configuration_error',
        'Feedback is unavailable because the GitHub App bot login is not configured.',
      );
    }
    this.appBotLogin = env.GITHUB_APP_BOT_LOGIN.toLocaleLowerCase();
  }

  private isAppComment(comment: GitHubComment): boolean {
    return (
      comment.user?.type === 'Bot' && comment.user.login.toLocaleLowerCase() === this.appBotLogin
    );
  }

  private projectIssue(issue: GitHubIssue): IssueProjection | undefined {
    if (issue.pull_request) return undefined;
    const labels = labelNames(issue);
    const parsed = parseIssueBody(issue.body);
    const isAppIssue =
      issue.user?.type === 'Bot' && issue.user.login.toLocaleLowerCase() === this.appBotLogin;
    if (!isAppIssue || !labels.includes(FEEDBACK_SCOPE_LABEL) || !parsed.metadata) {
      return undefined;
    }
    return {
      issue,
      body: parsed.body,
      authorName: parsed.metadata.displayName || 'Anonymous',
      labels,
    };
  }

  private async getIssueProjection(number: number): Promise<IssueProjection> {
    const issue = await this.client.request<GitHubIssue>(`${this.repositoryPath}/issues/${number}`);
    const projection = this.projectIssue(issue);
    if (!projection) {
      throw new FeedbackError(404, 'feedback_not_found', 'Feedback was not found.');
    }
    return projection;
  }

  private listComments(number: number): Promise<GitHubComment[]> {
    return this.client.paginate<GitHubComment>(`${this.repositoryPath}/issues/${number}/comments`);
  }

  private toDiscussionComments(comments: readonly GitHubComment[]): FeedbackDiscussionComment[] {
    return comments.flatMap((comment) => {
      const isAppComment = this.isAppComment(comment);
      if (isAppComment && parseVoteToken(comment.body)) return [];
      const portalComment = isAppComment
        ? parsePortalComment(comment.body)
        : { body: comment.body };
      const body = portalComment.body.trim();
      if (!body) return [];
      const isPortalComment = Boolean(portalComment.metadata);
      const isDeveloper = ['OWNER', 'MEMBER', 'COLLABORATOR'].includes(comment.author_association);
      return [
        {
          id: comment.id,
          body,
          authorName:
            portalComment.metadata?.displayName || comment.user?.login || 'Excalimate team',
          authorAvatarUrl: !isPortalComment ? comment.user?.avatar_url : undefined,
          authorUrl: !isPortalComment ? comment.user?.html_url : undefined,
          isDeveloper,
          createdAt: comment.created_at,
          htmlUrl: comment.html_url,
        },
      ];
    });
  }

  private toSummary(
    projection: IssueProjection,
    comments: readonly GitHubComment[],
  ): FeedbackSummary {
    const discussion = this.toDiscussionComments(comments);
    return {
      number: projection.issue.number,
      title: projection.issue.title,
      excerpt: excerpt(projection.body),
      category: getCategoryFromLabels(projection.labels),
      status: getStatusFromLabels(projection.labels),
      voteCount: comments.filter(
        (comment) => this.isAppComment(comment) && parseVoteToken(comment.body),
      ).length,
      commentCount: discussion.length,
      createdAt: projection.issue.created_at,
      updatedAt: projection.issue.updated_at,
      authorName: projection.authorName,
      htmlUrl: projection.issue.html_url,
    };
  }

  private assertWritable(projection: IssueProjection): void {
    const status = getStatusFromLabels(projection.labels);
    if (isTerminalStatus(status)) {
      throw new FeedbackError(
        409,
        'feedback_read_only',
        `${FEEDBACK_STATUSES[status].label} feedback is read-only.`,
      );
    }
  }

  async list(input: ListFeedbackInput): Promise<{
    items: FeedbackSummary[];
    total: number;
    totalPages: number;
  }> {
    const issues = await this.client.paginate<GitHubIssue>(
      `${this.repositoryPath}/issues?state=all&labels=${encodeURIComponent(FEEDBACK_SCOPE_LABEL)}`,
    );
    const projections = issues
      .map((issue) => this.projectIssue(issue))
      .filter((item): item is IssueProjection => Boolean(item));

    const summaries = await mapWithConcurrency(projections, 6, async (projection) =>
      this.toSummary(projection, await this.listComments(projection.issue.number)),
    );
    const query = input.search.toLocaleLowerCase();
    const filtered = summaries.filter((item) => {
      if (input.category !== 'all' && item.category !== input.category) return false;
      if (input.status !== 'all' && item.status !== input.status) return false;
      if (query && !`${item.title} ${item.excerpt}`.toLocaleLowerCase().includes(query)) {
        return false;
      }
      return true;
    });

    filtered.sort((left, right) => {
      if (input.sort === 'top') {
        return (
          right.voteCount - left.voteCount ||
          right.commentCount - left.commentCount ||
          Date.parse(right.createdAt) - Date.parse(left.createdAt)
        );
      }
      return Date.parse(right.createdAt) - Date.parse(left.createdAt);
    });

    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / input.pageSize));
    const start = (Math.min(input.page, totalPages) - 1) * input.pageSize;
    return {
      items: filtered.slice(start, start + input.pageSize),
      total,
      totalPages,
    };
  }

  async get(number: number, voterToken: string): Promise<FeedbackDetail> {
    const projection = await this.getIssueProjection(number);
    const comments = await this.listComments(number);
    return {
      ...this.toSummary(projection, comments),
      body: projection.body,
      viewerHasVoted: comments.some(
        (comment) => this.isAppComment(comment) && parseVoteToken(comment.body) === voterToken,
      ),
      comments: this.toDiscussionComments(comments),
    };
  }

  async create(input: CreateFeedbackInput): Promise<number> {
    const issue = await this.client.request<GitHubIssue>(`${this.repositoryPath}/issues`, {
      method: 'POST',
      body: JSON.stringify({
        title: input.title,
        body: createIssueBody(input.description, input.displayName),
        labels: [
          FEEDBACK_SCOPE_LABEL,
          FEEDBACK_CATEGORIES[input.category].githubLabel,
          FEEDBACK_STATUSES[DEFAULT_FEEDBACK_STATUS].githubLabel,
        ],
      }),
    });
    return issue.number;
  }

  async addComment(
    number: number,
    input: CreateCommentInput,
    authorToken: string,
  ): Promise<FeedbackDiscussionComment[]> {
    const projection = await this.getIssueProjection(number);
    this.assertWritable(projection);
    await this.client.request<GitHubComment>(`${this.repositoryPath}/issues/${number}/comments`, {
      method: 'POST',
      body: JSON.stringify({
        body: createPortalCommentBody(input.body, input.displayName, authorToken),
      }),
    });
    return this.toDiscussionComments(await this.listComments(number));
  }

  async vote(number: number, voterToken: string): Promise<FeedbackMutationResponse> {
    const projection = await this.getIssueProjection(number);
    this.assertWritable(projection);
    const existing = (await this.listComments(number)).filter(
      (comment) => this.isAppComment(comment) && parseVoteToken(comment.body) === voterToken,
    );

    if (existing.length === 0) {
      await this.client.request<GitHubComment>(`${this.repositoryPath}/issues/${number}/comments`, {
        method: 'POST',
        body: JSON.stringify({ body: createVoteBody(voterToken) }),
      });
    }

    const comments = await this.listComments(number);
    const matching = comments.filter(
      (comment) => this.isAppComment(comment) && parseVoteToken(comment.body) === voterToken,
    );
    for (const duplicate of matching.slice(1)) {
      await this.client.request<void>(`${this.repositoryPath}/issues/comments/${duplicate.id}`, {
        method: 'DELETE',
      });
    }
    return {
      voteCount:
        comments.filter((comment) => this.isAppComment(comment) && parseVoteToken(comment.body))
          .length - Math.max(0, matching.length - 1),
      viewerHasVoted: true,
    };
  }

  async unvote(number: number, voterToken: string): Promise<FeedbackMutationResponse> {
    const projection = await this.getIssueProjection(number);
    this.assertWritable(projection);
    const comments = await this.listComments(number);
    const matching = comments.filter(
      (comment) => this.isAppComment(comment) && parseVoteToken(comment.body) === voterToken,
    );
    for (const ballot of matching) {
      await this.client.request<void>(`${this.repositoryPath}/issues/comments/${ballot.id}`, {
        method: 'DELETE',
      });
    }
    return {
      voteCount:
        comments.filter((comment) => this.isAppComment(comment) && parseVoteToken(comment.body))
          .length - matching.length,
      viewerHasVoted: false,
    };
  }
}

export type { FeedbackCategory, FeedbackStatus };

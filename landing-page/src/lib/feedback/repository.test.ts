import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createIssueBody, createPortalCommentBody, createVoteBody } from './metadata';

const github = vi.hoisted(() => ({
  request: vi.fn(),
  paginate: vi.fn(),
}));

vi.mock('./github', () => ({
  GitHubClient: class {
    request = github.request;
    paginate = github.paginate;
  },
}));

import { GitHubFeedbackRepository } from './repository';

const env = {
  GITHUB_REPOSITORY_OWNER: 'excalimate',
  GITHUB_REPOSITORY_NAME: 'excalimate',
  GITHUB_APP_BOT_LOGIN: 'excalimate-feedback[bot]',
} as Cloudflare.Env;

function issue(number: number, title: string, labels: string[]) {
  return {
    number,
    title,
    body: createIssueBody(`${title} needs a longer description for testing.`, 'Anonymous'),
    state: 'open',
    labels: labels.map((name) => ({ name })),
    created_at: `2026-07-${String(number).padStart(2, '0')}T00:00:00Z`,
    updated_at: `2026-07-${String(number).padStart(2, '0')}T00:00:00Z`,
    html_url: `https://github.com/excalimate/excalimate/issues/${number}`,
    user: {
      login: 'excalimate-feedback[bot]',
      avatar_url: 'https://github.com/app-avatar.png',
      html_url: 'https://github.com/apps/excalimate-feedback',
      type: 'Bot',
    },
  };
}

function comment(
  id: number,
  body: string,
  options: { bot?: boolean; association?: 'NONE' | 'OWNER' } = {},
) {
  const bot = options.bot ?? false;
  return {
    id,
    body,
    created_at: '2026-07-11T00:00:00Z',
    html_url: `https://github.com/comment/${id}`,
    user: {
      login: bot ? 'excalimate-feedback[bot]' : 'maintainer',
      avatar_url: 'https://github.com/avatar.png',
      html_url: 'https://github.com/maintainer',
      type: bot ? 'Bot' : 'User',
    },
    author_association: options.association ?? 'NONE',
  };
}

describe('GitHubFeedbackRepository', () => {
  beforeEach(() => {
    github.request.mockReset();
    github.paginate.mockReset();
  });

  it('counts exact ballots, excludes them from discussion, and sorts by votes', async () => {
    const first = issue(1, 'First idea', ['feedback', 'feedback: feature', 'status: under review']);
    const second = issue(2, 'Second idea', [
      'feedback',
      'feedback: improvement',
      'status: planned',
    ]);
    github.paginate.mockImplementation((path: string) => {
      if (path.includes('?state=all')) return Promise.resolve([first, second]);
      if (path.includes('/issues/1/comments')) {
        return Promise.resolve([
          comment(11, createVoteBody('a'.repeat(32)), { bot: true }),
          comment(12, createPortalCommentBody('Useful context', 'Visitor', 'a'.repeat(32)), {
            bot: true,
          }),
        ]);
      }
      return Promise.resolve([
        comment(21, createVoteBody('b'.repeat(32)), { bot: true }),
        comment(22, createVoteBody('c'.repeat(32)), { bot: true }),
      ]);
    });

    const result = await new GitHubFeedbackRepository(env).list({
      search: '',
      category: 'all',
      status: 'all',
      sort: 'top',
      page: 1,
      pageSize: 20,
    });

    expect(result.items.map((item) => item.number)).toEqual([2, 1]);
    expect(result.items[0]).toMatchObject({ voteCount: 2, commentCount: 0 });
    expect(result.items[1]).toMatchObject({ voteCount: 1, commentCount: 1 });
  });

  it('deduplicates concurrent ballots from the same browser', async () => {
    const target = issue(3, 'Concurrent voting', [
      'feedback',
      'feedback: feature',
      'status: under review',
    ]);
    github.request.mockImplementation((path: string, init?: RequestInit) => {
      if (path.endsWith('/issues/3') && !init?.method) return Promise.resolve(target);
      return Promise.resolve(comment(31, createVoteBody('t'.repeat(32)), { bot: true }));
    });
    github.paginate
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        comment(31, createVoteBody('t'.repeat(32)), { bot: true }),
        comment(32, createVoteBody('t'.repeat(32)), { bot: true }),
        comment(33, createVoteBody('o'.repeat(32)), { bot: true }),
      ]);

    const result = await new GitHubFeedbackRepository(env).vote(3, 't'.repeat(32));

    expect(result).toEqual({ voteCount: 2, viewerHasVoted: true });
    expect(github.request).toHaveBeenCalledWith('/repos/excalimate/excalimate/issues/comments/32', {
      method: 'DELETE',
    });
  });

  it('does not trust portal markers posted by regular GitHub users', async () => {
    const target = issue(5, 'Marker forgery', [
      'feedback',
      'feedback: feature',
      'status: under review',
    ]);
    github.request.mockResolvedValue(target);
    github.paginate.mockResolvedValue([
      comment(51, createVoteBody('f'.repeat(32))),
      comment(52, createPortalCommentBody('Forged identity', 'Excalimate team', 'a'.repeat(32))),
    ]);

    const result = await new GitHubFeedbackRepository(env).get(5, 'viewer-token');

    expect(result).toMatchObject({ voteCount: 0, commentCount: 2 });
    expect(result.comments.every((entry) => !entry.isDeveloper)).toBe(true);
    expect(result.comments.every((entry) => entry.authorName === 'maintainer')).toBe(true);
  });

  it('does not expose labeled issues copied by a regular GitHub user', async () => {
    const copied = {
      ...issue(6, 'Copied marker', ['feedback', 'feedback: feature', 'status: under review']),
      user: {
        login: 'outsider',
        avatar_url: 'https://github.com/avatar.png',
        html_url: 'https://github.com/outsider',
        type: 'User',
      },
    };
    github.paginate.mockResolvedValue([copied]);

    const result = await new GitHubFeedbackRepository(env).list({
      search: '',
      category: 'all',
      status: 'all',
      sort: 'top',
      page: 1,
      pageSize: 20,
    });

    expect(result.items).toEqual([]);
    expect(result.total).toBe(0);
  });

  it('rejects writes to terminal feedback', async () => {
    github.request.mockResolvedValue(
      issue(4, 'Completed idea', ['feedback', 'feedback: feature', 'status: completed']),
    );

    await expect(new GitHubFeedbackRepository(env).vote(4, 'token')).rejects.toMatchObject({
      status: 409,
      code: 'feedback_read_only',
    });
  });
});

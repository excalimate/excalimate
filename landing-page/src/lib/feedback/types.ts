import type { FeedbackCategory, FeedbackStatus } from './config';

export interface FeedbackSummary {
  number: number;
  title: string;
  excerpt: string;
  category: FeedbackCategory;
  status: FeedbackStatus;
  voteCount: number;
  commentCount: number;
  createdAt: string;
  updatedAt: string;
  authorName: string;
  htmlUrl: string;
}

export interface FeedbackDiscussionComment {
  id: number;
  body: string;
  authorName: string;
  authorAvatarUrl?: string;
  authorUrl?: string;
  isDeveloper: boolean;
  createdAt: string;
  htmlUrl: string;
}

export interface FeedbackDetail extends FeedbackSummary {
  body: string;
  viewerHasVoted: boolean;
  comments: FeedbackDiscussionComment[];
}

export interface FeedbackListResponse {
  items: FeedbackSummary[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  turnstileSiteKey: string;
}

export interface FeedbackDetailResponse {
  item: FeedbackDetail;
  turnstileSiteKey: string;
}

export interface FeedbackMutationResponse {
  voteCount: number;
  viewerHasVoted: boolean;
}

export interface FeedbackCreatedResponse {
  number: number;
  url: string;
}

export interface FeedbackCommentsResponse {
  comments: FeedbackDiscussionComment[];
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    fieldErrors?: Record<string, string[]>;
  };
}

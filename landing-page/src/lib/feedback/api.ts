import type {
  ApiErrorResponse,
  FeedbackCommentsResponse,
  FeedbackCreatedResponse,
  FeedbackDetailResponse,
  FeedbackListResponse,
  FeedbackMutationResponse,
} from './types';

const FEEDBACK_LIST_STALE_KEY = 'excalimate-feedback-list-stale';

export class FeedbackApiError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly fieldErrors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = 'FeedbackApiError';
  }
}

async function request<T>(path: string, init: RequestInit = {}, signal?: AbortSignal): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: 'same-origin',
    signal,
    headers: {
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
  });
  const payload = (await response.json()) as T | ApiErrorResponse;
  if (!response.ok) {
    const error = (payload as ApiErrorResponse).error;
    throw new FeedbackApiError(
      error?.message || 'Feedback could not be loaded.',
      error?.code || 'request_failed',
      error?.fieldErrors,
    );
  }
  return payload as T;
}

export interface FeedbackListQuery {
  search: string;
  category: string;
  status: string;
  sort: string;
  page: number;
}

interface FeedbackListRequestOptions {
  signal?: AbortSignal;
  fresh?: boolean;
}

export function markFeedbackListStale(): void {
  if (typeof window !== 'undefined') {
    window.sessionStorage.setItem(FEEDBACK_LIST_STALE_KEY, 'true');
  }
}

export function isFeedbackListStale(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.sessionStorage.getItem(FEEDBACK_LIST_STALE_KEY) === 'true'
  );
}

export function clearFeedbackListStale(): void {
  if (typeof window !== 'undefined') {
    window.sessionStorage.removeItem(FEEDBACK_LIST_STALE_KEY);
  }
}

export function listFeedback(
  query: FeedbackListQuery,
  options: FeedbackListRequestOptions = {},
): Promise<FeedbackListResponse> {
  const search = new URLSearchParams({
    search: query.search,
    category: query.category,
    status: query.status,
    sort: query.sort,
    page: String(query.page),
  });
  if (options.fresh) search.set('_fresh', String(Date.now()));
  return request<FeedbackListResponse>(
    `/api/feedback?${search}`,
    options.fresh ? { cache: 'no-store' } : {},
    options.signal,
  );
}

export function getFeedback(number: number, signal?: AbortSignal): Promise<FeedbackDetailResponse> {
  return request<FeedbackDetailResponse>(`/api/feedback/${number}`, {}, signal);
}

export function createFeedback(input: {
  title: string;
  description: string;
  displayName: string;
  category: string;
  turnstileToken: string;
}): Promise<FeedbackCreatedResponse> {
  return request<FeedbackCreatedResponse>('/api/feedback', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function setFeedbackVote(
  number: number,
  add: boolean,
  turnstileToken: string,
): Promise<FeedbackMutationResponse> {
  return request<FeedbackMutationResponse>(`/api/feedback/${number}/vote`, {
    method: add ? 'POST' : 'DELETE',
    body: JSON.stringify({ turnstileToken }),
  });
}

export function addFeedbackComment(
  number: number,
  input: {
    body: string;
    displayName: string;
    turnstileToken: string;
  },
): Promise<FeedbackCommentsResponse> {
  return request<FeedbackCommentsResponse>(`/api/feedback/${number}/comments`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

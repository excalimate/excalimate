import { ZodError } from 'zod';
import { asFeedbackError, FeedbackError } from './errors';
import type { ApiErrorResponse } from './types';

const BASE_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'X-Content-Type-Options': 'nosniff',
};

export function jsonResponse<T>(
  value: T,
  options: {
    status?: number;
    cacheControl?: string;
    setCookie?: string;
  } = {},
): Response {
  const headers = new Headers(BASE_HEADERS);
  headers.set('Cache-Control', options.cacheControl ?? 'no-store');
  if (options.setCookie) headers.set('Set-Cookie', options.setCookie);
  return Response.json(value, { status: options.status ?? 200, headers });
}

export function errorResponse(error: unknown): Response {
  if (error instanceof ZodError) {
    const fieldErrors = error.flatten().fieldErrors;
    return jsonResponse<ApiErrorResponse>(
      {
        error: {
          code: 'validation_error',
          message: 'Please correct the highlighted fields.',
          fieldErrors,
        },
      },
      { status: 400 },
    );
  }

  const feedbackError = asFeedbackError(error);
  if (feedbackError.status >= 500) console.error(feedbackError);
  return jsonResponse<ApiErrorResponse>(
    {
      error: {
        code: feedbackError.code,
        message: feedbackError.message,
      },
    },
    { status: feedbackError.status },
  );
}

export async function readJson(request: Request): Promise<unknown> {
  const length = Number(request.headers.get('Content-Length') || '0');
  if (length > 16_384) {
    throw new FeedbackError(413, 'request_too_large', 'Request body is too large.');
  }
  try {
    const body = await request.text();
    if (new TextEncoder().encode(body).byteLength > 16_384) {
      throw new FeedbackError(413, 'request_too_large', 'Request body is too large.');
    }
    return JSON.parse(body) as unknown;
  } catch (error) {
    if (error instanceof FeedbackError) throw error;
    throw new FeedbackError(400, 'invalid_json', 'The request body is not valid JSON.', {
      cause: error,
    });
  }
}

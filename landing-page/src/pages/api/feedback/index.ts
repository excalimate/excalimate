import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { getAnonymousIdentity } from '../../../lib/feedback/identity';
import { GitHubFeedbackRepository } from '../../../lib/feedback/repository';
import { errorResponse, jsonResponse, readJson } from '../../../lib/feedback/response';
import { createFeedbackSchema, listFeedbackSchema } from '../../../lib/feedback/schemas';
import {
  assertMutationRequest,
  getTurnstileSiteKey,
  verifyMutation,
} from '../../../lib/feedback/security';
import type { FeedbackCreatedResponse, FeedbackListResponse } from '../../../lib/feedback/types';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const input = listFeedbackSchema.parse(Object.fromEntries(url.searchParams.entries()));
    const repository = new GitHubFeedbackRepository(env);
    const result = await repository.list(input);
    const page = Math.min(input.page, result.totalPages);
    return jsonResponse<FeedbackListResponse>(
      {
        ...result,
        page,
        pageSize: input.pageSize,
        turnstileSiteKey: getTurnstileSiteKey(env),
      },
      {
        cacheControl: 'public, max-age=30, s-maxage=30, stale-while-revalidate=120',
      },
    );
  } catch (error) {
    return errorResponse(error);
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    assertMutationRequest(request);
    const input = createFeedbackSchema.parse(await readJson(request));
    await verifyMutation(request, env, input.turnstileToken, 'submission');
    const identity = await getAnonymousIdentity(request, env.FEEDBACK_COOKIE_SECRET);
    const repository = new GitHubFeedbackRepository(env);
    const number = await repository.create(input);
    return jsonResponse<FeedbackCreatedResponse>(
      { number, url: `/feedback/${number}` },
      { status: 201, setCookie: identity.setCookie },
    );
  } catch (error) {
    return errorResponse(error);
  }
};

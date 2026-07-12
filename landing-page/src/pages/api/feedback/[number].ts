import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import {
  createVoterToken,
  getAnonymousIdentity,
} from '../../../lib/feedback/identity';
import { GitHubFeedbackRepository } from '../../../lib/feedback/repository';
import { errorResponse, jsonResponse } from '../../../lib/feedback/response';
import { parseFeedbackNumber } from '../../../lib/feedback/route';
import { getTurnstileSiteKey } from '../../../lib/feedback/security';
import type { FeedbackDetailResponse } from '../../../lib/feedback/types';

export const prerender = false;

export const GET: APIRoute = async ({ params, request }) => {
  try {
    const number = parseFeedbackNumber(params.number);
    const identity = await getAnonymousIdentity(request, env.FEEDBACK_COOKIE_SECRET);
    const voterToken = await createVoterToken(
      identity.id,
      number,
      env.FEEDBACK_COOKIE_SECRET,
    );
    const repository = new GitHubFeedbackRepository(env);
    const item = await repository.get(number, voterToken);
    return jsonResponse<FeedbackDetailResponse>(
      { item, turnstileSiteKey: getTurnstileSiteKey(env) },
      { setCookie: identity.setCookie },
    );
  } catch (error) {
    return errorResponse(error);
  }
};

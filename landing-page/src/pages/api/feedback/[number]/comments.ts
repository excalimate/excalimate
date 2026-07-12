import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import {
  createAuthorToken,
  getAnonymousIdentity,
} from '../../../../lib/feedback/identity';
import { GitHubFeedbackRepository } from '../../../../lib/feedback/repository';
import {
  errorResponse,
  jsonResponse,
  readJson,
} from '../../../../lib/feedback/response';
import { parseFeedbackNumber } from '../../../../lib/feedback/route';
import { createCommentSchema } from '../../../../lib/feedback/schemas';
import {
  assertMutationRequest,
  verifyMutation,
} from '../../../../lib/feedback/security';
import type { FeedbackCommentsResponse } from '../../../../lib/feedback/types';

export const prerender = false;

export const POST: APIRoute = async ({ params, request }) => {
  try {
    const number = parseFeedbackNumber(params.number);
    assertMutationRequest(request);
    const input = createCommentSchema.parse(await readJson(request));
    await verifyMutation(request, env, input.turnstileToken, 'interaction');
    const identity = await getAnonymousIdentity(request, env.FEEDBACK_COOKIE_SECRET);
    const authorToken = await createAuthorToken(
      identity.id,
      number,
      env.FEEDBACK_COOKIE_SECRET,
    );
    const repository = new GitHubFeedbackRepository(env);
    const comments = await repository.addComment(number, input, authorToken);
    return jsonResponse<FeedbackCommentsResponse>(
      { comments },
      { status: 201, setCookie: identity.setCookie },
    );
  } catch (error) {
    return errorResponse(error);
  }
};

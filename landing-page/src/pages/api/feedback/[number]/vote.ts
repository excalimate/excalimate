import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import {
  createVoterToken,
  getAnonymousIdentity,
} from '../../../../lib/feedback/identity';
import { GitHubFeedbackRepository } from '../../../../lib/feedback/repository';
import {
  errorResponse,
  jsonResponse,
  readJson,
} from '../../../../lib/feedback/response';
import { parseFeedbackNumber } from '../../../../lib/feedback/route';
import { voteSchema } from '../../../../lib/feedback/schemas';
import {
  assertMutationRequest,
  verifyMutation,
} from '../../../../lib/feedback/security';
import type { FeedbackMutationResponse } from '../../../../lib/feedback/types';

export const prerender = false;

async function mutateVote(request: Request, numberValue: string | undefined, add: boolean) {
  try {
    const number = parseFeedbackNumber(numberValue);
    assertMutationRequest(request);
    const input = voteSchema.parse(await readJson(request));
    await verifyMutation(request, env, input.turnstileToken, 'interaction');
    const identity = await getAnonymousIdentity(request, env.FEEDBACK_COOKIE_SECRET);
    const voterToken = await createVoterToken(
      identity.id,
      number,
      env.FEEDBACK_COOKIE_SECRET,
    );
    const repository = new GitHubFeedbackRepository(env);
    const result = add
      ? await repository.vote(number, voterToken)
      : await repository.unvote(number, voterToken);
    return jsonResponse<FeedbackMutationResponse>(result, {
      setCookie: identity.setCookie,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export const POST: APIRoute = ({ params, request }) =>
  mutateVote(request, params.number, true);

export const DELETE: APIRoute = ({ params, request }) =>
  mutateVote(request, params.number, false);

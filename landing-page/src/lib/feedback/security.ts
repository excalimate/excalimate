import { FeedbackError } from './errors';

type MutationKind = 'submission' | 'interaction';

const TURNSTILE_ALWAYS_PASS_TEST_SECRET = '1x0000000000000000000000000000000AA';

export type FeedbackSecurityEnv = Pick<
  Cloudflare.Env,
  | 'TURNSTILE_SECRET_KEY'
  | 'TURNSTILE_SITE_KEY'
  | 'TURNSTILE_ALLOWED_HOSTNAMES'
  | 'FEEDBACK_SUBMISSION_RATE_LIMITER'
  | 'FEEDBACK_INTERACTION_RATE_LIMITER'
>;

interface TurnstileResult {
  success: boolean;
  hostname?: string;
}

function clientAddress(request: Request): string {
  return (
    request.headers.get('CF-Connecting-IP') ||
    request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
    'local'
  );
}

export function assertMutationRequest(request: Request): void {
  const origin = request.headers.get('Origin');
  if (!origin || origin !== new URL(request.url).origin) {
    throw new FeedbackError(403, 'invalid_origin', 'This request did not come from Excalimate.');
  }
  if (!request.headers.get('Content-Type')?.toLowerCase().startsWith('application/json')) {
    throw new FeedbackError(415, 'invalid_content_type', 'Expected a JSON request.');
  }
}

async function enforceRateLimit(
  request: Request,
  env: FeedbackSecurityEnv,
  kind: MutationKind,
): Promise<void> {
  const limiter =
    kind === 'submission'
      ? env.FEEDBACK_SUBMISSION_RATE_LIMITER
      : env.FEEDBACK_INTERACTION_RATE_LIMITER;
  if (!limiter) {
    throw new FeedbackError(503, 'configuration_error', 'Feedback protection is not configured.');
  }
  const outcome = await limiter.limit({
    key: `${kind}:${clientAddress(request)}`,
  });
  if (!outcome.success) {
    throw new FeedbackError(
      429,
      'rate_limited',
      'Too many feedback requests. Please wait and try again.',
    );
  }
}

async function verifyTurnstile(
  request: Request,
  env: FeedbackSecurityEnv,
  token: string,
): Promise<void> {
  if (!env.TURNSTILE_SECRET_KEY) {
    throw new FeedbackError(503, 'configuration_error', 'Feedback protection is not configured.');
  }

  const body = new FormData();
  body.set('secret', env.TURNSTILE_SECRET_KEY);
  body.set('response', token);
  body.set('remoteip', clientAddress(request));
  body.set('idempotency_key', crypto.randomUUID());
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  let response: Response;
  try {
    response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body,
      signal: controller.signal,
    });
  } catch (error) {
    throw new FeedbackError(
      502,
      'turnstile_unavailable',
      'Verification is temporarily unavailable.',
      { cause: error },
    );
  } finally {
    clearTimeout(timeout);
  }
  if (!response.ok) {
    throw new FeedbackError(
      502,
      'turnstile_unavailable',
      'Verification is temporarily unavailable.',
    );
  }

  const result = (await response.json()) as TurnstileResult;
  const allowedHostnames = (env.TURNSTILE_ALLOWED_HOSTNAMES || '')
    .split(',')
    .map((hostname) => hostname.trim())
    .filter(Boolean);
  const usesAlwaysPassTestSecret =
    env.TURNSTILE_SECRET_KEY === TURNSTILE_ALWAYS_PASS_TEST_SECRET;
  if (
    !result.success ||
    (!usesAlwaysPassTestSecret &&
      allowedHostnames.length > 0 &&
      (!result.hostname || !allowedHostnames.includes(result.hostname)))
  ) {
    throw new FeedbackError(400, 'turnstile_failed', 'Verification failed. Please try again.');
  }
}

export async function verifyMutation(
  request: Request,
  env: FeedbackSecurityEnv,
  token: string,
  kind: MutationKind,
): Promise<void> {
  assertMutationRequest(request);
  await enforceRateLimit(request, env, kind);
  await verifyTurnstile(request, env, token);
}

export function getTurnstileSiteKey(env: Pick<Cloudflare.Env, 'TURNSTILE_SITE_KEY'>): string {
  if (!env.TURNSTILE_SITE_KEY) {
    throw new FeedbackError(503, 'configuration_error', 'Feedback protection is not configured.');
  }
  return env.TURNSTILE_SITE_KEY;
}

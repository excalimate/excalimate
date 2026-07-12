import { beforeEach, describe, expect, it, vi } from 'vitest';
import { verifyMutation, type FeedbackSecurityEnv } from './security';

const limit = vi.fn();
const env = {
  TURNSTILE_SECRET_KEY: 'turnstile-secret',
  TURNSTILE_SITE_KEY: 'turnstile-site-key',
  TURNSTILE_ALLOWED_HOSTNAMES: 'excalimate.com',
  FEEDBACK_SUBMISSION_RATE_LIMITER: { limit },
  FEEDBACK_INTERACTION_RATE_LIMITER: { limit },
} satisfies FeedbackSecurityEnv;

function mutationRequest(origin = 'https://excalimate.com') {
  const request = new Request('https://excalimate.com/api/feedback', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: '{}',
  });
  request.headers.set('Origin', origin);
  request.headers.set('CF-Connecting-IP', '203.0.113.10');
  return request;
}

describe('feedback mutation security', () => {
  beforeEach(() => {
    limit.mockResolvedValue({ success: true });
  });

  it('accepts same-origin, rate-limited, verified mutations', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({ success: true, hostname: 'excalimate.com' }),
    );

    await expect(
      verifyMutation(mutationRequest(), env, 'token', 'submission'),
    ).resolves.toBeUndefined();
    expect(limit).toHaveBeenCalledWith({ key: 'submission:203.0.113.10' });
  });

  it('rejects cross-origin requests before verification', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    await expect(
      verifyMutation(mutationRequest('https://attacker.example'), env, 'token', 'submission'),
    ).rejects.toMatchObject({ status: 403, code: 'invalid_origin' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('requires an allowed hostname in the Turnstile response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ success: true }));
    await expect(
      verifyMutation(mutationRequest(), env, 'token', 'interaction'),
    ).rejects.toMatchObject({ status: 400, code: 'turnstile_failed' });
  });

  it('accepts the synthetic hostname returned for the always-pass test secret', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({ success: true, hostname: 'example.com' }),
    );

    await expect(
      verifyMutation(
        mutationRequest(),
        {
          ...env,
          TURNSTILE_SECRET_KEY: '1x0000000000000000000000000000000AA',
          TURNSTILE_ALLOWED_HOSTNAMES: 'localhost,127.0.0.1',
        },
        'token',
        'submission',
      ),
    ).resolves.toBeUndefined();
  });

  it('surfaces rate limits without calling Turnstile', async () => {
    limit.mockResolvedValue({ success: false });
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    await expect(
      verifyMutation(mutationRequest(), env, 'token', 'interaction'),
    ).rejects.toMatchObject({ status: 429, code: 'rate_limited' });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

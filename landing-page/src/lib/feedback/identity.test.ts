// @vitest-environment node

import { describe, expect, it } from 'vitest';
import { createVoterToken, getAnonymousIdentity } from './identity';

const SECRET = 'a-secret-value-that-is-at-least-thirty-two-characters';

describe('anonymous feedback identity', () => {
  it('sets and validates a signed first-party cookie', async () => {
    const first = await getAnonymousIdentity(
      new Request('https://excalimate.com/feedback'),
      SECRET,
    );
    expect(first.setCookie).toContain('HttpOnly');
    expect(first.setCookie).toContain('SameSite=Lax');

    const cookie = first.setCookie?.split(';')[0] ?? '';
    const second = await getAnonymousIdentity(
      new Request('https://excalimate.com/feedback', {
        headers: { Cookie: cookie },
      }),
      SECRET,
    );
    expect(second.id).toBe(first.id);
    expect(second.setCookie).toBeUndefined();
  });

  it('creates unlinkable per-issue voter tokens', async () => {
    const first = await createVoterToken('browser-id', 10, SECRET);
    const second = await createVoterToken('browser-id', 11, SECRET);
    expect(first).not.toBe(second);
    expect(first).toBe(await createVoterToken('browser-id', 10, SECRET));
  });

  it('replaces a tampered cookie', async () => {
    const identity = await getAnonymousIdentity(
      new Request('https://excalimate.com/feedback', {
        headers: { Cookie: 'excalimate_feedback_id=forged.invalid' },
      }),
      SECRET,
    );
    expect(identity.id).not.toBe('forged');
    expect(identity.setCookie).toBeDefined();
  });
});

import { describe, expect, it } from 'vitest';
import { readJson } from './response';

describe('feedback JSON requests', () => {
  it('rejects oversized chunked bodies without Content-Length', async () => {
    const request = new Request('https://excalimate.com/api/feedback', {
      method: 'POST',
      body: JSON.stringify({ value: 'x'.repeat(17_000) }),
    });
    request.headers.delete('Content-Length');

    await expect(readJson(request)).rejects.toMatchObject({
      status: 413,
      code: 'request_too_large',
    });
  });

  it('reports malformed JSON', async () => {
    const request = new Request('https://excalimate.com/api/feedback', {
      method: 'POST',
      body: '{',
    });
    await expect(readJson(request)).rejects.toMatchObject({
      status: 400,
      code: 'invalid_json',
    });
  });
});

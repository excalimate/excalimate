import { beforeEach, describe, expect, it, vi } from 'vitest';
import worker, { type Env } from './index';

interface StoredObject {
  body: Uint8Array;
  customMetadata: Record<string, string>;
  httpMetadata: {
    cacheControl?: string;
    contentType?: string;
  };
}

interface UploadResponse {
  id: string;
  expiresAt: string;
  deleteSecret: string;
}

class MemoryBucket {
  readonly objects = new Map<string, StoredObject>();
  getCalls = 0;
  putCalls = 0;

  async put(
    key: string,
    value: ArrayBuffer,
    options: {
      customMetadata?: Record<string, string>;
      httpMetadata?: StoredObject['httpMetadata'];
    },
  ): Promise<void> {
    this.putCalls += 1;
    this.objects.set(key, {
      body: new Uint8Array(value.slice(0)),
      customMetadata: { ...options.customMetadata },
      httpMetadata: { ...options.httpMetadata },
    });
  }

  async get(key: string): Promise<object | null> {
    this.getCalls += 1;
    const stored = this.objects.get(key);
    if (!stored) return null;
    return {
      body: new Response(stored.body).body,
      customMetadata: stored.customMetadata,
      httpMetadata: stored.httpMetadata,
    };
  }

  async head(key: string): Promise<object | null> {
    const stored = this.objects.get(key);
    if (!stored) return null;
    return {
      customMetadata: stored.customMetadata,
      httpMetadata: stored.httpMetadata,
    };
  }

  async delete(key: string): Promise<void> {
    this.objects.delete(key);
  }
}

class MemoryQuota {
  readonly reservations = new Map<string, { size: number; expiresAt: number; clientKey: string }>();

  readonly stub = {
    fetch: async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const request = new Request(input, init);
      const body = (await request.json()) as Record<string, unknown>;
      if (new URL(request.url).pathname === '/release') {
        this.reservations.delete(String(body.id));
        return Response.json({ released: true });
      }

      const now = Date.now();
      for (const [id, reservation] of this.reservations) {
        if (reservation.expiresAt <= now) this.reservations.delete(id);
      }

      const id = String(body.id);
      const size = Number(body.size);
      const maxShares = Number(body.maxShares);
      const maxBytes = Number(body.maxBytes);
      const clientKey = String(body.clientKey);
      const maxClientShares = Number(body.maxClientShares);
      const totalBytes = [...this.reservations.values()].reduce(
        (total, reservation) => total + reservation.size,
        0,
      );
      const accepted =
        !this.reservations.has(id) &&
        this.reservations.size < maxShares &&
        totalBytes + size <= maxBytes &&
        [...this.reservations.values()].filter((reservation) => reservation.clientKey === clientKey)
          .length < maxClientShares;
      const reason =
        [...this.reservations.values()].filter((reservation) => reservation.clientKey === clientKey)
          .length >= maxClientShares
          ? 'client'
          : 'capacity';
      if (accepted) {
        this.reservations.set(id, {
          expiresAt: Number(body.expiresAt),
          size,
          clientKey,
        });
      }
      return Response.json({ accepted, ...(accepted ? {} : { reason }) });
    },
  };

  readonly namespace = {
    idFromName: () => ({ toString: () => 'global-share-quota' }),
    get: () => this.stub,
  };
}

const allowedOrigin = 'https://app.excalimate.com';

function createHarness(overrides: Partial<Env> = {}) {
  const bucket = new MemoryBucket();
  const legacyBucket = new MemoryBucket();
  const quota = new MemoryQuota();
  const env: Env = {
    ALLOWED_ORIGINS: `${allowedOrigin},http://localhost:5173`,
    MAX_SHARE_SIZE_MB: '1',
    MAX_TOTAL_SHARES: '2',
    MAX_TOTAL_STORAGE_MB: '2',
    SHARE_TTL_DAYS: '30',
    MAX_SHARES_PER_CLIENT: '20',
    CLIENT_ID_HASH_KEY: 'test-client-identity-hmac-key-32-bytes',
    LEGACY_SHARE_BUCKET: legacyBucket as unknown as R2Bucket,
    SHARE_BUCKET: bucket as unknown as R2Bucket,
    SHARE_QUOTA: quota.namespace as unknown as DurableObjectNamespace,
    ...overrides,
  };
  return { bucket, env, legacyBucket, quota };
}

function uploadRequest(
  body: BodyInit = new Uint8Array([1, 2, 3, 4]),
  headers: HeadersInit = {},
): Request {
  return new Request('https://share.example/share', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/octet-stream',
      Origin: allowedOrigin,
      'CF-Connecting-IP': '203.0.113.10',
      ...headers,
    },
    body,
  });
}

async function upload(env: Env, body: BodyInit = new Uint8Array([1, 2, 3, 4])) {
  const response = await worker.fetch(uploadRequest(body), env);
  const result = (await response.json()) as UploadResponse;
  return { response, result };
}

describe('share worker', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('answers valid CORS preflights with an exact allowed origin', async () => {
    const { env } = createHarness();
    const request = new Request('https://share.example/share', {
      method: 'OPTIONS',
      headers: {
        Origin: allowedOrigin,
        'Access-Control-Request-Headers': 'content-type',
        'Access-Control-Request-Method': 'POST',
      },
    });

    const response = await worker.fetch(request, env);

    expect(response.status).toBe(204);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(allowedOrigin);
    expect(response.headers.get('Access-Control-Allow-Methods')).toBe('POST, OPTIONS');
    expect(response.headers.get('Access-Control-Allow-Headers')).toContain('Content-Type');
    expect(response.headers.get('Vary')).toContain('Origin');
  });

  it('rejects disallowed and missing origins before write processing', async () => {
    const { bucket, env, quota } = createHarness();
    const disallowed = uploadRequest(new Uint8Array([1]), {
      Origin: 'https://attacker.example',
    });
    const missing = uploadRequest(new Uint8Array([1]));
    missing.headers.delete('Origin');

    const disallowedResponse = await worker.fetch(disallowed, env);
    const missingResponse = await worker.fetch(missing, env);
    const preflightResponse = await worker.fetch(
      new Request('https://share.example/share', {
        method: 'OPTIONS',
        headers: {
          Origin: 'https://attacker.example',
          'Access-Control-Request-Method': 'POST',
        },
      }),
      env,
    );

    expect(disallowedResponse.status).toBe(403);
    expect(missingResponse.status).toBe(403);
    expect(preflightResponse.status).toBe(403);
    expect(disallowedResponse.headers.get('Access-Control-Allow-Origin')).toBeNull();
    expect(bucket.putCalls).toBe(0);
    expect(quota.reservations.size).toBe(0);
  });

  it('enforces methods, query-free routes, and exact content type', async () => {
    const { env } = createHarness();

    const methodResponse = await worker.fetch(
      new Request('https://share.example/share', { method: 'PUT' }),
      env,
    );
    const parameterizedTypeResponse = await worker.fetch(
      uploadRequest(new Uint8Array([1]), {
        'Content-Type': 'application/octet-stream; charset=binary',
      }),
      env,
    );
    const queryResponse = await worker.fetch(
      new Request('https://share.example/share?cache-bust=1', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
          Origin: allowedOrigin,
        },
        body: new Uint8Array([1]),
      }),
      env,
    );

    expect(methodResponse.status).toBe(405);
    expect(methodResponse.headers.get('Allow')).toBe('POST, OPTIONS');
    expect(parameterizedTypeResponse.status).toBe(415);
    expect(queryResponse.status).toBe(400);
  });

  it('enforces declared and streamed body limits', async () => {
    const { bucket, env } = createHarness();
    const declaredResponse = await worker.fetch(
      uploadRequest(new Uint8Array([1]), { 'Content-Length': '1048577' }),
      env,
    );
    const streamedResponse = await worker.fetch(
      uploadRequest(new Uint8Array(1024 * 1024 + 1)),
      env,
    );

    expect(declaredResponse.status).toBe(413);
    expect(streamedResponse.status).toBe(413);
    expect(bucket.putCalls).toBe(0);
  });

  it('accepts a bounded upload without Content-Length and creates 128-bit IDs', async () => {
    const { env } = createHarness();
    const first = await upload(env);
    const second = await upload(env);

    expect(first.response.status).toBe(201);
    expect(first.result.id).toMatch(/^[A-Za-z0-9_-]{22}$/);
    expect(first.result.deleteSecret).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(first.result.id).not.toBe(second.result.id);
    expect(Date.parse(first.result.expiresAt)).toBeGreaterThan(Date.now());
  });

  it('strictly rejects malformed share IDs before reading R2', async () => {
    const { bucket, env } = createHarness();

    for (const id of [
      'short',
      'AAAAAAAAAAAAAAAAAAAAA!',
      'A'.repeat(23),
      'A'.repeat(7),
      'A'.repeat(9),
    ]) {
      const response = await worker.fetch(new Request(`https://share.example/share/${id}`), env);
      expect(response.status).toBe(400);
    }
    expect(bucket.getCalls).toBe(0);
  });

  it('keeps strictly formatted legacy IDs readable during bucket migration', async () => {
    const { env, legacyBucket } = createHarness();
    const legacyId = 'AbCdEf12';
    const ciphertext = new Uint8Array([91, 17, 3]);
    legacyBucket.objects.set(legacyId, {
      body: ciphertext,
      customMetadata: {
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
      },
      httpMetadata: {
        cacheControl: 'public, max-age=60, immutable',
        contentType: 'application/octet-stream',
      },
    });

    const response = await worker.fetch(
      new Request(`https://share.example/share/${legacyId}`),
      env,
    );

    expect(response.status).toBe(200);
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(ciphertext);
    expect(legacyBucket.getCalls).toBe(1);
  });

  it('stores opaque ciphertext and serves it with immutable security headers', async () => {
    const { bucket, env } = createHarness();
    const ciphertext = new Uint8Array([0, 255, 17, 88, 31, 201]);
    const { result } = await upload(env, ciphertext);
    const stored = bucket.objects.get(result.id);

    expect(stored?.body).toEqual(ciphertext);
    expect(stored?.customMetadata).toEqual({
      deleteVerifier: expect.stringMatching(/^[A-Za-z0-9_-]{43}$/),
      expiresAt: result.expiresAt,
    });
    expect(JSON.stringify(stored)).not.toContain(result.deleteSecret);

    const response = await worker.fetch(
      new Request(`https://share.example/share/${result.id}`, {
        headers: { Origin: allowedOrigin },
      }),
      env,
    );

    expect(response.status).toBe(200);
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(ciphertext);
    expect(response.headers.get('Content-Type')).toBe('application/octet-stream');
    expect(response.headers.get('Cache-Control')).toContain('immutable');
    expect(response.headers.get('Cache-Control')).toContain('public');
    expect(response.headers.get('Cross-Origin-Resource-Policy')).toBe('cross-origin');
    expect(response.headers.get('Referrer-Policy')).toBe('no-referrer');
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(response.headers.get('X-Request-Id')).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('enforces logical expiry before R2 lifecycle cleanup', async () => {
    const { bucket, env } = createHarness();
    const { result } = await upload(env);
    const stored = bucket.objects.get(result.id);
    if (!stored) throw new Error('Expected stored object.');
    stored.customMetadata.expiresAt = new Date(Date.now() - 1).toISOString();

    const response = await worker.fetch(
      new Request(`https://share.example/share/${result.id}`),
      env,
    );

    expect(response.status).toBe(404);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });

  it('enforces durable count quota before R2 writes', async () => {
    const { bucket, env, quota } = createHarness({ MAX_TOTAL_SHARES: '1' });
    const first = await upload(env);
    const second = await upload(env);

    expect(first.response.status).toBe(201);
    expect(second.response.status).toBe(429);
    expect(second.response.headers.get('Retry-After')).toBe('3600');
    expect(bucket.putCalls).toBe(1);
    expect(quota.reservations.size).toBe(1);
  });

  it('limits live shares per pseudonymous Cloudflare client without sharing raw addresses', async () => {
    const { bucket, env, quota } = createHarness({ MAX_SHARES_PER_CLIENT: '1' });
    const first = await upload(env);
    const second = await upload(env);
    const otherClient = await worker.fetch(
      uploadRequest(new Uint8Array([5]), { 'CF-Connecting-IP': '203.0.113.11' }),
      env,
    );

    expect(first.response.status).toBe(201);
    expect(second.response.status).toBe(429);
    expect(otherClient.status).toBe(201);
    expect(bucket.putCalls).toBe(2);
    expect(JSON.stringify([...quota.reservations.values()])).not.toContain('203.0.113.');
    expect([...quota.reservations.values()][0]?.clientKey).toMatch(/^[a-f0-9]{64}$/);
  });

  it('deletes only with the returned capability and releases quota', async () => {
    const { bucket, env, quota } = createHarness({ MAX_TOTAL_SHARES: '1' });
    const { result } = await upload(env);

    const wrongSecretResponse = await worker.fetch(
      new Request(`https://share.example/share/${result.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${'A'.repeat(43)}`,
          Origin: allowedOrigin,
        },
      }),
      env,
    );
    expect(wrongSecretResponse.status).toBe(403);
    expect(bucket.objects.has(result.id)).toBe(true);

    const deleteResponse = await worker.fetch(
      new Request(`https://share.example/share/${result.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${result.deleteSecret}`,
          Origin: allowedOrigin,
        },
      }),
      env,
    );
    expect(deleteResponse.status).toBe(204);
    expect(bucket.objects.has(result.id)).toBe(false);
    expect(quota.reservations.size).toBe(0);

    const replacement = await upload(env);
    expect(replacement.response.status).toBe(201);
  });

  it('fails closed on invalid configuration with sanitized errors', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { env } = createHarness({ MAX_TOTAL_SHARES: 'not-a-number' });

    const response = await worker.fetch(new Request('https://share.example/health'), env);
    const body = (await response.json()) as { error: string; requestId: string };

    expect(response.status).toBe(503);
    expect(body.error).toBe('Service is temporarily unavailable.');
    expect(JSON.stringify(body)).not.toContain('MAX_TOTAL_SHARES');
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(body.requestId).toBe(response.headers.get('X-Request-Id'));
    expect(errorSpy).toHaveBeenCalledOnce();
  });
});

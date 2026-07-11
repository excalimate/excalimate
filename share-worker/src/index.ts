import { ShareQuota } from './quota';

export { ShareQuota };

export interface Env {
  SHARE_BUCKET: R2Bucket;
  LEGACY_SHARE_BUCKET: R2Bucket;
  SHARE_QUOTA: DurableObjectNamespace;
  MAX_SHARE_SIZE_MB?: string;
  SHARE_TTL_DAYS?: string;
  MAX_TOTAL_SHARES?: string;
  MAX_TOTAL_STORAGE_MB?: string;
  ALLOWED_ORIGINS?: string;
}

interface ShareConfig {
  allowedOrigins: Set<string>;
  maxShareSizeBytes: number;
  maxTotalShares: number;
  maxTotalStorageBytes: number;
  ttlDays: number;
}

interface QuotaReservation {
  id: string;
  size: number;
  expiresAt: number;
  maxShares: number;
  maxBytes: number;
}

interface QuotaResponse {
  accepted: boolean;
}

const SHARE_ID_PATTERN = /^[A-Za-z0-9_-]{22}$/;
const LEGACY_SHARE_ID_PATTERN = /^[A-Za-z0-9_-]{8}$/;
const DELETE_SECRET_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const DAY_MS = 86_400_000;
const DEFAULT_MAX_SHARE_SIZE_MB = 2;
const DEFAULT_SHARE_TTL_DAYS = 30;
const DEFAULT_MAX_TOTAL_SHARES = 2_000;
const DEFAULT_MAX_TOTAL_STORAGE_MB = 4_096;
const MAX_CONFIGURED_SHARE_SIZE_MB = 25;
const MAX_CONFIGURED_TTL_DAYS = 365;

class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly headers?: HeadersInit,
  ) {
    super(message);
  }
}

class PayloadTooLargeError extends HttpError {
  constructor(maxSizeMb: number) {
    super(413, `Maximum share size is ${maxSizeMb} MB.`);
  }
}

function parseInteger(
  value: string | undefined,
  fallback: number,
  name: string,
  minimum: number,
  maximum: number,
): number {
  const candidate = value ?? String(fallback);
  if (!/^(0|[1-9]\d*)$/.test(candidate)) {
    throw new Error(`${name} must be an integer.`);
  }

  const parsed = Number(candidate);
  if (!Number.isSafeInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error(`${name} is outside its supported range.`);
  }
  return parsed;
}

function parseAllowedOrigins(value: string | undefined): Set<string> {
  if (!value?.trim()) {
    throw new Error('ALLOWED_ORIGINS must contain at least one origin.');
  }

  const origins = new Set<string>();
  for (const rawOrigin of value.split(',')) {
    const origin = rawOrigin.trim();
    if (!origin || origin === '*') {
      throw new Error('ALLOWED_ORIGINS cannot contain empty or wildcard origins.');
    }

    let parsed: URL;
    try {
      parsed = new URL(origin);
    } catch {
      throw new Error('ALLOWED_ORIGINS contains an invalid URL.');
    }

    const isLocalHttp =
      parsed.protocol === 'http:' &&
      (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1');
    if (parsed.origin !== origin || (parsed.protocol !== 'https:' && !isLocalHttp)) {
      throw new Error('ALLOWED_ORIGINS must contain HTTPS origins or local development origins.');
    }
    origins.add(origin);
  }

  return origins;
}

function parseConfig(env: Env): ShareConfig {
  const maxShareSizeMb = parseInteger(
    env.MAX_SHARE_SIZE_MB,
    DEFAULT_MAX_SHARE_SIZE_MB,
    'MAX_SHARE_SIZE_MB',
    1,
    MAX_CONFIGURED_SHARE_SIZE_MB,
  );
  const maxTotalStorageMb = parseInteger(
    env.MAX_TOTAL_STORAGE_MB,
    DEFAULT_MAX_TOTAL_STORAGE_MB,
    'MAX_TOTAL_STORAGE_MB',
    maxShareSizeMb,
    100_000,
  );

  return {
    allowedOrigins: parseAllowedOrigins(env.ALLOWED_ORIGINS),
    maxShareSizeBytes: maxShareSizeMb * 1024 * 1024,
    maxTotalShares: parseInteger(
      env.MAX_TOTAL_SHARES,
      DEFAULT_MAX_TOTAL_SHARES,
      'MAX_TOTAL_SHARES',
      1,
      100_000,
    ),
    maxTotalStorageBytes: maxTotalStorageMb * 1024 * 1024,
    ttlDays: parseInteger(
      env.SHARE_TTL_DAYS,
      DEFAULT_SHARE_TTL_DAYS,
      'SHARE_TTL_DAYS',
      1,
      MAX_CONFIGURED_TTL_DAYS,
    ),
  };
}

function securityHeaders(requestId: string, cacheControl = 'no-store'): Headers {
  return new Headers({
    'Cache-Control': cacheControl,
    'Cross-Origin-Resource-Policy': 'cross-origin',
    'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff',
    'X-Request-Id': requestId,
  });
}

function addCorsHeaders(
  headers: Headers,
  request: Request,
  config: ShareConfig,
  methods = 'GET, POST, DELETE, OPTIONS',
): void {
  const origin = request.headers.get('Origin');
  headers.append('Vary', 'Origin');
  if (!origin || !config.allowedOrigins.has(origin)) return;

  headers.set('Access-Control-Allow-Origin', origin);
  headers.set('Access-Control-Allow-Methods', methods);
  headers.set('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  headers.set('Access-Control-Expose-Headers', 'X-Request-Id');
  headers.set('Access-Control-Max-Age', '86400');
}

function responseHeaders(
  request: Request,
  config: ShareConfig,
  requestId: string,
  cacheControl = 'no-store',
  methods?: string,
): Headers {
  const headers = securityHeaders(requestId, cacheControl);
  addCorsHeaders(headers, request, config, methods);
  return headers;
}

function jsonResponse(
  request: Request,
  config: ShareConfig,
  requestId: string,
  body: unknown,
  status = 200,
  extraHeaders?: HeadersInit,
): Response {
  const headers = responseHeaders(request, config, requestId);
  headers.set('Content-Type', 'application/json; charset=utf-8');
  if (extraHeaders) {
    new Headers(extraHeaders).forEach((value, key) => headers.set(key, value));
  }
  return Response.json(body, { status, headers });
}

function errorResponse(
  request: Request,
  config: ShareConfig,
  requestId: string,
  error: HttpError,
): Response {
  return jsonResponse(
    request,
    config,
    requestId,
    { error: error.message, requestId },
    error.status,
    error.headers,
  );
}

function isAllowedOrigin(request: Request, config: ShareConfig): boolean {
  const origin = request.headers.get('Origin');
  return origin !== null && config.allowedOrigins.has(origin);
}

function requireAllowedOrigin(request: Request, config: ShareConfig): void {
  if (!isAllowedOrigin(request, config)) {
    throw new HttpError(403, 'Origin is not allowed.');
  }
}

function generateToken(byteLength: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(byteLength));
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function decodeBase64Url(value: string): Uint8Array {
  const padding = '='.repeat((4 - (value.length % 4)) % 4);
  const binary = atob(value.replace(/-/g, '+').replace(/_/g, '/') + padding);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function hashDeleteSecret(secret: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret));
  const bytes = new Uint8Array(digest);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function constantTimeEqual(left: Uint8Array, right: Uint8Array): boolean {
  const length = Math.max(left.length, right.length);
  let difference = left.length ^ right.length;
  for (let index = 0; index < length; index += 1) {
    difference |= (left[index] ?? 0) ^ (right[index] ?? 0);
  }
  return difference === 0;
}

async function verifyDeleteSecret(secret: string, verifier: string): Promise<boolean> {
  const candidateVerifier = await hashDeleteSecret(secret);
  return constantTimeEqual(decodeBase64Url(candidateVerifier), decodeBase64Url(verifier));
}

function parseContentLength(request: Request, maxSizeBytes: number): number | null {
  const rawLength = request.headers.get('Content-Length');
  if (rawLength === null) return null;
  if (!/^(0|[1-9]\d*)$/.test(rawLength)) {
    throw new HttpError(400, 'Content-Length is invalid.');
  }

  const length = Number(rawLength);
  if (!Number.isSafeInteger(length)) {
    throw new HttpError(400, 'Content-Length is invalid.');
  }
  if (length > maxSizeBytes) {
    throw new PayloadTooLargeError(maxSizeBytes / 1024 / 1024);
  }
  return length;
}

async function readBoundedBody(request: Request, maxSizeBytes: number): Promise<ArrayBuffer> {
  if (!request.body) return new ArrayBuffer(0);

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    totalBytes += value.byteLength;
    if (totalBytes > maxSizeBytes) {
      await reader.cancel();
      throw new PayloadTooLargeError(maxSizeBytes / 1024 / 1024);
    }
    chunks.push(value);
  }

  const body = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body.buffer;
}

function quotaStub(env: Env): DurableObjectStub {
  const id = env.SHARE_QUOTA.idFromName('global-share-quota');
  return env.SHARE_QUOTA.get(id);
}

async function reserveQuota(env: Env, reservation: QuotaReservation): Promise<boolean> {
  const response = await quotaStub(env).fetch('https://quota.internal/reserve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(reservation),
  });
  if (!response.ok) throw new Error('Share quota service unavailable.');

  const result = await response.json<QuotaResponse>();
  return result.accepted;
}

async function releaseQuota(env: Env, id: string): Promise<void> {
  const response = await quotaStub(env).fetch('https://quota.internal/release', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  });
  if (!response.ok) throw new Error('Share quota service unavailable.');
}

function parseShareId(pathname: string): string | null {
  const match = /^\/share\/([^/]+)$/.exec(pathname);
  return match?.[1] ?? null;
}

function assertValidShareId(id: string | null, allowLegacy = false): asserts id is string {
  if (!id || (!SHARE_ID_PATTERN.test(id) && !(allowLegacy && LEGACY_SHARE_ID_PATTERN.test(id)))) {
    throw new HttpError(400, 'Share ID is invalid.');
  }
}

function assertNoQuery(url: URL): void {
  if (url.search) {
    throw new HttpError(400, 'Query parameters are not supported.');
  }
}

function parseStoredExpiry(value: string | undefined): number {
  if (!value) throw new Error('Share expiry metadata is missing.');
  const expiresAt = Date.parse(value);
  if (!Number.isFinite(expiresAt)) throw new Error('Share expiry metadata is invalid.');
  return expiresAt;
}

async function handleUpload(
  request: Request,
  env: Env,
  config: ShareConfig,
  requestId: string,
): Promise<Response> {
  requireAllowedOrigin(request, config);
  if (request.headers.get('Content-Type') !== 'application/octet-stream') {
    throw new HttpError(415, 'Content-Type must be application/octet-stream.');
  }

  const declaredLength = parseContentLength(request, config.maxShareSizeBytes);
  const body = await readBoundedBody(request, config.maxShareSizeBytes);
  if (body.byteLength === 0) throw new HttpError(400, 'Request body is empty.');
  if (declaredLength !== null && declaredLength !== body.byteLength) {
    throw new HttpError(400, 'Content-Length does not match the request body.');
  }

  const id = generateToken(16);
  const deleteSecret = generateToken(32);
  const deleteVerifier = await hashDeleteSecret(deleteSecret);
  const expiresAtMs = Date.now() + config.ttlDays * DAY_MS;
  const expiresAt = new Date(expiresAtMs).toISOString();
  const accepted = await reserveQuota(env, {
    id,
    size: body.byteLength,
    expiresAt: expiresAtMs,
    maxShares: config.maxTotalShares,
    maxBytes: config.maxTotalStorageBytes,
  });
  if (!accepted) {
    throw new HttpError(429, 'Share storage capacity is currently full.', {
      'Retry-After': '3600',
    });
  }

  try {
    await env.SHARE_BUCKET.put(id, body, {
      httpMetadata: {
        cacheControl: `public, max-age=${config.ttlDays * 86400}, immutable`,
        contentType: 'application/octet-stream',
      },
      customMetadata: {
        deleteVerifier,
        expiresAt,
      },
    });
  } catch (error) {
    await releaseQuota(env, id).catch((releaseError: unknown) => {
      console.error(`[${requestId}] failed to roll back quota reservation`, {
        error: releaseError instanceof Error ? releaseError.message : 'Unknown error',
      });
    });
    throw error;
  }

  return jsonResponse(request, config, requestId, { id, expiresAt, deleteSecret }, 201);
}

async function handleDownload(
  request: Request,
  env: Env,
  config: ShareConfig,
  requestId: string,
  id: string,
): Promise<Response> {
  const bucket = LEGACY_SHARE_ID_PATTERN.test(id) ? env.LEGACY_SHARE_BUCKET : env.SHARE_BUCKET;
  const object = await bucket.get(id);
  if (!object) throw new HttpError(404, 'Share was not found or has expired.');

  const expiresAt = parseStoredExpiry(object.customMetadata?.expiresAt);
  if (expiresAt <= Date.now()) {
    throw new HttpError(404, 'Share was not found or has expired.');
  }

  const remainingSeconds = Math.max(1, Math.floor((expiresAt - Date.now()) / 1000));
  const headers = responseHeaders(
    request,
    config,
    requestId,
    `public, max-age=${remainingSeconds}, immutable`,
  );
  headers.set('Content-Type', 'application/octet-stream');
  return new Response(object.body, { headers });
}

async function handleDelete(
  request: Request,
  env: Env,
  config: ShareConfig,
  requestId: string,
  id: string,
): Promise<Response> {
  requireAllowedOrigin(request, config);
  const object = await env.SHARE_BUCKET.head(id);
  if (!object) throw new HttpError(404, 'Share was not found or has expired.');

  const authorization = request.headers.get('Authorization') ?? '';
  const match = /^Bearer ([A-Za-z0-9_-]{43})$/.exec(authorization);
  const suppliedSecret = match?.[1] ?? '';
  const verifier = object.customMetadata?.deleteVerifier ?? '';
  const verifierIsValid = DELETE_SECRET_PATTERN.test(verifier);
  const secretMatches = verifierIsValid && (await verifyDeleteSecret(suppliedSecret, verifier));
  if (!match || !secretMatches) {
    throw new HttpError(403, 'Delete capability is invalid.');
  }

  await env.SHARE_BUCKET.delete(id);
  try {
    await releaseQuota(env, id);
  } catch (error) {
    console.error(`[${requestId}] deleted share but failed to release quota`, {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  return new Response(null, {
    status: 204,
    headers: responseHeaders(request, config, requestId),
  });
}

function handlePreflight(
  request: Request,
  config: ShareConfig,
  requestId: string,
  methods: string[],
): Response {
  requireAllowedOrigin(request, config);
  const requestedMethod = request.headers.get('Access-Control-Request-Method');
  if (!requestedMethod || !methods.includes(requestedMethod)) {
    throw new HttpError(405, 'Requested method is not allowed.', {
      Allow: methods.join(', '),
    });
  }

  const requestedHeaders = (request.headers.get('Access-Control-Request-Headers') ?? '')
    .split(',')
    .map((header) => header.trim().toLowerCase())
    .filter(Boolean);
  if (requestedHeaders.some((header) => !['authorization', 'content-type'].includes(header))) {
    throw new HttpError(400, 'Requested headers are not allowed.');
  }

  return new Response(null, {
    status: 204,
    headers: responseHeaders(
      request,
      config,
      requestId,
      'no-store',
      [...methods, 'OPTIONS'].join(', '),
    ),
  });
}

async function routeRequest(
  request: Request,
  env: Env,
  config: ShareConfig,
  requestId: string,
): Promise<Response> {
  const url = new URL(request.url);

  if (url.pathname === '/health') {
    assertNoQuery(url);
    if (request.method !== 'GET') {
      throw new HttpError(405, 'Method is not allowed.', { Allow: 'GET' });
    }
    return jsonResponse(request, config, requestId, { status: 'ok' });
  }

  if (url.pathname === '/share') {
    assertNoQuery(url);
    if (request.method === 'OPTIONS') {
      return handlePreflight(request, config, requestId, ['POST']);
    }
    if (request.method !== 'POST') {
      throw new HttpError(405, 'Method is not allowed.', { Allow: 'POST, OPTIONS' });
    }
    return handleUpload(request, env, config, requestId);
  }

  if (url.pathname.startsWith('/share/')) {
    assertNoQuery(url);
    const id = parseShareId(url.pathname);

    if (request.method === 'OPTIONS') {
      const requestedMethod = request.headers.get('Access-Control-Request-Method');
      assertValidShareId(id, requestedMethod === 'GET');
      return handlePreflight(request, config, requestId, ['GET', 'DELETE']);
    }
    if (request.method === 'GET') {
      assertValidShareId(id, true);
      return handleDownload(request, env, config, requestId, id);
    }
    if (request.method === 'DELETE') {
      assertValidShareId(id);
      return handleDelete(request, env, config, requestId, id);
    }
    assertValidShareId(id);
    throw new HttpError(405, 'Method is not allowed.', {
      Allow: 'GET, DELETE, OPTIONS',
    });
  }

  throw new HttpError(404, 'Route was not found.');
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const requestId = crypto.randomUUID();
    let config: ShareConfig;
    try {
      config = parseConfig(env);
    } catch (error) {
      console.error(`[${requestId}] invalid worker configuration`, {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      const headers = securityHeaders(requestId);
      headers.set('Content-Type', 'application/json; charset=utf-8');
      return Response.json(
        { error: 'Service is temporarily unavailable.', requestId },
        { status: 503, headers },
      );
    }

    try {
      return await routeRequest(request, env, config, requestId);
    } catch (error) {
      if (error instanceof HttpError) {
        return errorResponse(request, config, requestId, error);
      }

      const url = new URL(request.url);
      console.error(`[${requestId}] unhandled share worker error`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        method: request.method,
        pathname: url.pathname,
      });
      return errorResponse(
        request,
        config,
        requestId,
        new HttpError(500, 'Internal server error.'),
      );
    }
  },
} satisfies ExportedHandler<Env>;

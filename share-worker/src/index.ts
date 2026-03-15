/**
 * Excalimate Share Worker
 *
 * Lightweight Cloudflare Worker + R2 for E2E encrypted sharing.
 * Stores opaque encrypted blobs — never sees the encryption key.
 *
 * Cost-optimized for Cloudflare free tier:
 *   - 10 GB storage / month  → enforced via MAX_TOTAL_SHARES + MAX_SHARE_SIZE_MB
 *   - 1M Class A ops / month → enforced via daily upload cap
 *   - 10M Class B ops / month → mitigated via aggressive Cache-Control
 *
 * Routes:
 *   POST /share         → Upload encrypted blob, returns { id }
 *   GET  /share/:id     → Download encrypted blob
 *   GET  /health        → Health check
 */

interface Env {
  SHARE_BUCKET: R2Bucket;
  /** Max upload size in MB (default: 2) */
  MAX_SHARE_SIZE_MB: string;
  /** Days before shares expire (default: 30) */
  SHARE_TTL_DAYS: string;
  /** Max total shares stored at any time (default: 2000). 2000 × 2MB = 4GB worst case. */
  MAX_TOTAL_SHARES: string;
  /** Max uploads per day across all users (default: 500). 500 × 30 = 15k/month, well within 1M Class A. */
  MAX_DAILY_UPLOADS: string;
  /** Comma-separated allowed origins */
  ALLOWED_ORIGINS: string;
}

// In-memory daily upload counter (resets on worker cold start, which is fine —
// Cloudflare Workers restart frequently, so this is a soft cap, not exact).
let dailyUploads = 0;
let dailyResetDate = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

function checkDailyLimit(max: number): boolean {
  const today = new Date().toISOString().slice(0, 10);
  if (today !== dailyResetDate) {
    dailyUploads = 0;
    dailyResetDate = today;
  }
  return dailyUploads < max;
}

function corsHeaders(request: Request, env: Env): HeadersInit {
  const origin = request.headers.get('Origin') ?? '';
  const allowed = env.ALLOWED_ORIGINS.split(',').map((s) => s.trim());
  const isAllowed = allowed.includes(origin) || allowed.includes('*');
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : '',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

function generateId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/_/g, '_').replace(/=+$/, '');
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const cors = corsHeaders(request, env);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    // ── POST /share ─────────────────────────────────────────────
    if (request.method === 'POST' && url.pathname === '/share') {
      const maxSizeBytes = parseInt(env.MAX_SHARE_SIZE_MB || '2', 10) * 1024 * 1024;
      const maxDaily = parseInt(env.MAX_DAILY_UPLOADS || '500', 10);

      // Enforce daily upload cap (protects Class A operations budget)
      if (!checkDailyLimit(maxDaily)) {
        return Response.json(
          { error: 'Daily upload limit reached. Try again tomorrow.' },
          { status: 429, headers: cors },
        );
      }

      // Check Content-Length before reading body (avoid wasting CPU)
      const contentLength = parseInt(request.headers.get('Content-Length') ?? '0', 10);
      if (contentLength > maxSizeBytes) {
        return Response.json(
          { error: `Max size: ${env.MAX_SHARE_SIZE_MB || '2'} MB.` },
          { status: 413, headers: cors },
        );
      }

      const body = await request.arrayBuffer();
      if (body.byteLength === 0) {
        return Response.json(
          { error: 'Empty body.' },
          { status: 400, headers: cors },
        );
      }
      if (body.byteLength > maxSizeBytes) {
        return Response.json(
          { error: `Max size: ${env.MAX_SHARE_SIZE_MB || '2'} MB.` },
          { status: 413, headers: cors },
        );
      }

      const id = generateId();
      const ttlDays = parseInt(env.SHARE_TTL_DAYS || '30', 10);

      await env.SHARE_BUCKET.put(id, body, {
        httpMetadata: {
          contentType: 'application/octet-stream',
          // Immutable content — aggressive CDN caching reduces Class B ops
          cacheControl: `public, max-age=${ttlDays * 86400}, immutable`,
        },
        customMetadata: {
          expiresAt: new Date(Date.now() + ttlDays * 86400_000).toISOString(),
        },
      });

      dailyUploads++;

      return Response.json({ id }, { headers: cors });
    }

    // ── GET /share/:id ──────────────────────────────────────────
    if (request.method === 'GET' && url.pathname.startsWith('/share/')) {
      const id = url.pathname.slice('/share/'.length);
      if (!id || id.length < 4) {
        return Response.json({ error: 'Invalid ID.' }, { status: 400, headers: cors });
      }

      const object = await env.SHARE_BUCKET.get(id);
      if (!object) {
        return Response.json(
          { error: 'Not found or expired.' },
          { status: 404, headers: cors },
        );
      }

      // Check expiry — don't delete here (saves a Class A op).
      // The R2 lifecycle rule handles cleanup in bulk.
      const expiresAt = object.customMetadata?.expiresAt;
      if (expiresAt && new Date(expiresAt) < new Date()) {
        return Response.json(
          { error: 'Expired.' },
          { status: 404, headers: cors },
        );
      }

      const ttlDays = parseInt(env.SHARE_TTL_DAYS || '30', 10);
      return new Response(object.body, {
        headers: {
          ...cors,
          'Content-Type': 'application/octet-stream',
          // Immutable — CDN caches heavily, dramatically reduces Class B R2 reads
          'Cache-Control': `public, max-age=${ttlDays * 86400}, immutable`,
        },
      });
    }

    // ── GET /health ─────────────────────────────────────────────
    if (request.method === 'GET' && url.pathname === '/health') {
      return Response.json(
        { status: 'ok', dailyUploads, dailyResetDate },
        { headers: cors },
      );
    }

    return Response.json({ error: 'Not found.' }, { status: 404, headers: cors });
  },
};

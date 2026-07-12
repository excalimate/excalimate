import { importPKCS8, SignJWT } from 'jose';
import { FeedbackError } from './errors';

const GITHUB_API = 'https://api.github.com';
const GITHUB_API_VERSION = '2022-11-28';
const REQUEST_TIMEOUT_MS = 12_000;
const TOKEN_REFRESH_WINDOW_MS = 60_000;

interface InstallationTokenResponse {
  token: string;
  expires_at: string;
}

interface CachedInstallationToken {
  key: string;
  token: string;
  expiresAt: number;
}

let cachedInstallationToken: CachedInstallationToken | undefined;

function requireValue(value: string | undefined, name: string): string {
  if (!value) {
    throw new FeedbackError(
      503,
      'configuration_error',
      `Feedback is unavailable because ${name} is not configured.`,
    );
  }
  return value;
}

function decodePem(value: string, label: string): Uint8Array {
  const base64 = value
    .replace(`-----BEGIN ${label}-----`, '')
    .replace(`-----END ${label}-----`, '')
    .replace(/\s+/gu, '');
  try {
    return Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
  } catch (error) {
    throw new FeedbackError(503, 'configuration_error', 'The GitHub App private key is invalid.', {
      cause: error,
    });
  }
}

function encodeDer(tag: number, value: Uint8Array): Uint8Array {
  const lengthBytes: number[] = [];
  let length = value.length;
  if (length < 128) {
    lengthBytes.push(length);
  } else {
    while (length > 0) {
      lengthBytes.unshift(length & 0xff);
      length >>>= 8;
    }
    lengthBytes.unshift(0x80 | lengthBytes.length);
  }
  return Uint8Array.from([tag, ...lengthBytes, ...value]);
}

function encodePem(value: Uint8Array, label: string): string {
  let binary = '';
  for (const byte of value) binary += String.fromCharCode(byte);
  const base64 = btoa(binary);
  const lines = base64.match(/.{1,64}/gu) ?? [];
  return `-----BEGIN ${label}-----\n${lines.join('\n')}\n-----END ${label}-----`;
}

export function normalizeGitHubPrivateKey(value: string): string {
  const normalized = value.replace(/\\n/gu, '\n').trim();
  if (normalized.includes('-----BEGIN PRIVATE KEY-----')) return normalized;
  if (!normalized.includes('-----BEGIN RSA PRIVATE KEY-----')) {
    throw new FeedbackError(503, 'configuration_error', 'The GitHub App private key is invalid.');
  }

  const pkcs1 = decodePem(normalized, 'RSA PRIVATE KEY');
  const version = Uint8Array.from([0x02, 0x01, 0x00]);
  const rsaAlgorithmIdentifier = Uint8Array.from([
    0x30, 0x0d, 0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01, 0x05, 0x00,
  ]);
  const privateKey = encodeDer(0x04, pkcs1);
  const body = Uint8Array.from([...version, ...rsaAlgorithmIdentifier, ...privateKey]);
  return encodePem(encodeDer(0x30, body), 'PRIVATE KEY');
}

async function createAppJwt(env: Cloudflare.Env): Promise<string> {
  const appId = requireValue(env.GITHUB_APP_ID, 'GITHUB_APP_ID');
  const privateKey = await importPKCS8(
    normalizeGitHubPrivateKey(requireValue(env.GITHUB_APP_PRIVATE_KEY, 'GITHUB_APP_PRIVATE_KEY')),
    'RS256',
  );
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({})
    .setProtectedHeader({ alg: 'RS256' })
    .setIssuedAt(now - 30)
    .setExpirationTime(now + 9 * 60)
    .setIssuer(appId)
    .sign(privateKey);
}

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    throw new FeedbackError(502, 'github_unavailable', 'GitHub is temporarily unavailable.', {
      cause: error,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function getInstallationToken(env: Cloudflare.Env): Promise<string> {
  const appId = requireValue(env.GITHUB_APP_ID, 'GITHUB_APP_ID');
  const installationId = requireValue(env.GITHUB_APP_INSTALLATION_ID, 'GITHUB_APP_INSTALLATION_ID');
  const cacheKey = `${appId}:${installationId}`;

  if (
    cachedInstallationToken?.key === cacheKey &&
    cachedInstallationToken.expiresAt - TOKEN_REFRESH_WINDOW_MS > Date.now()
  ) {
    return cachedInstallationToken.token;
  }

  const jwt = await createAppJwt(env);
  const response = await fetchWithTimeout(
    `${GITHUB_API}/app/installations/${installationId}/access_tokens`,
    {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${jwt}`,
        'X-GitHub-Api-Version': GITHUB_API_VERSION,
        'User-Agent': 'excalimate-feedback',
      },
    },
  );

  if (!response.ok) {
    throw new FeedbackError(502, 'github_authentication_failed', 'GitHub authentication failed.');
  }

  const payload = (await response.json()) as InstallationTokenResponse;
  cachedInstallationToken = {
    key: cacheKey,
    token: payload.token,
    expiresAt: Date.parse(payload.expires_at),
  };
  return payload.token;
}

export class GitHubClient {
  constructor(private readonly env: Cloudflare.Env) {}

  async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const token = await getInstallationToken(this.env);
    const response = await fetchWithTimeout(`${GITHUB_API}${path}`, {
      ...init,
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-GitHub-Api-Version': GITHUB_API_VERSION,
        'User-Agent': 'excalimate-feedback',
        ...init.headers,
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new FeedbackError(404, 'feedback_not_found', 'Feedback was not found.');
      }
      if (response.status === 403 || response.status === 429) {
        throw new FeedbackError(
          503,
          'github_rate_limited',
          'Feedback is temporarily unavailable due to GitHub rate limits.',
        );
      }
      throw new FeedbackError(502, 'github_error', 'GitHub could not process the request.');
    }

    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  }

  async paginate<T>(path: string): Promise<T[]> {
    const separator = path.includes('?') ? '&' : '?';
    const results: T[] = [];
    for (let page = 1; ; page += 1) {
      const batch = await this.request<T[]>(`${path}${separator}per_page=100&page=${page}`);
      results.push(...batch);
      if (batch.length < 100) return results;
    }
  }
}

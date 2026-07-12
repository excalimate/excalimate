import { FeedbackError } from './errors';

const COOKIE_NAME = 'excalimate_feedback_id';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/u, '');
}

function encode(value: string): ArrayBuffer {
  return new TextEncoder().encode(value).buffer;
}

async function hmac(value: string, secret: string): Promise<string> {
  if (secret.length < 32) {
    throw new FeedbackError(503, 'configuration_error', 'Feedback is temporarily unavailable.');
  }

  const key = await crypto.subtle.importKey(
    'raw',
    encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, encode(value));
  return toBase64Url(new Uint8Array(signature));
}

function parseCookies(header: string | null): Map<string, string> {
  const cookies = new Map<string, string>();
  for (const pair of header?.split(';') ?? []) {
    const separator = pair.indexOf('=');
    if (separator === -1) continue;
    cookies.set(pair.slice(0, separator).trim(), pair.slice(separator + 1).trim());
  }
  return cookies;
}

function equalStrings(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

export interface AnonymousIdentity {
  id: string;
  setCookie?: string;
}

export async function getAnonymousIdentity(
  request: Request,
  secret: string,
): Promise<AnonymousIdentity> {
  const cookie = parseCookies(request.headers.get('Cookie')).get(COOKIE_NAME);
  if (cookie) {
    const separator = cookie.lastIndexOf('.');
    const id = separator > 0 ? cookie.slice(0, separator) : '';
    const signature = separator > 0 ? cookie.slice(separator + 1) : '';
    const expected = id ? await hmac(id, secret) : '';
    if (id && signature && equalStrings(signature, expected)) return { id };
  }

  const id = crypto.randomUUID();
  const signature = await hmac(id, secret);
  return {
    id,
    setCookie: `${COOKIE_NAME}=${id}.${signature}; Path=/; Max-Age=${COOKIE_MAX_AGE}; HttpOnly; Secure; SameSite=Lax`,
  };
}

export async function createVoterToken(
  identityId: string,
  issueNumber: number,
  secret: string,
): Promise<string> {
  return hmac(`vote:${issueNumber}:${identityId}`, secret);
}

export async function createAuthorToken(
  identityId: string,
  issueNumber: number,
  secret: string,
): Promise<string> {
  return hmac(`comment:${issueNumber}:${identityId}`, secret);
}

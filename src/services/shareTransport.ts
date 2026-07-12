import { decryptData, importKeyFromString } from './encryption';

export const DEFAULT_SHARE_ORIGIN = 'https://share.excalimate.com';
const SHARE_ID_PATTERN = /^(?:[A-Za-z0-9_-]{8}|[A-Za-z0-9_-]{22})$/;
const KEY_PATTERN = /^(?:[A-Za-z0-9_-]{22}|[A-Za-z0-9_-]{43})$/;
const MAX_ENCRYPTED_SHARE_BYTES = 20 * 1024 * 1024;

export interface ShareReference {
  shareId: string;
  keyString: string;
}

export function parsePlayerShareFragment(hash: string): ShareReference {
  const match = /^#share=([^,]+),([^&,]+)$/.exec(hash);
  if (!match) throw new Error('This player link is invalid');
  return validateReference(match[1], match[2]);
}

export function parseEditorShareReference(input: string): ShareReference {
  const hashMatch = /#share=([^,]+),([^&\s]+)/.exec(input);
  const parts = hashMatch ? [hashMatch[1], hashMatch[2]] : input.split(',', 2);
  return validateReference(parts[0], parts[1]);
}

export async function downloadEncryptedShare(
  reference: ShareReference,
  options: {
    fetch?: typeof fetch;
    shareOrigin?: string;
  } = {},
): Promise<unknown> {
  const fetchImplementation = options.fetch ?? fetch;
  const shareOrigin = resolveShareOrigin(
    options.shareOrigin ?? import.meta.env.VITE_SHARE_API_URL ?? DEFAULT_SHARE_ORIGIN,
  );
  const response = await fetchImplementation(
    `${shareOrigin}/share/${encodeURIComponent(reference.shareId)}`,
    {
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
    },
  );
  if (!response.ok) throw new Error('Shared animation not found.');

  const encrypted = await readResponseBytes(response);
  const key = await importKeyFromString(reference.keyString);
  return decryptData(encrypted, key);
}

export function buildHostedPlayerUrl(appOrigin: string, reference: ShareReference): string {
  const origin = new URL(appOrigin).origin;
  const validated = validateReference(reference.shareId, reference.keyString);
  return `${origin}/player.html#share=${validated.shareId},${validated.keyString}`;
}

export function buildEditorShareUrl(appOrigin: string, reference: ShareReference): string {
  const origin = new URL(appOrigin).origin;
  const validated = validateReference(reference.shareId, reference.keyString);
  return `${origin}/#share=${validated.shareId},${validated.keyString}`;
}

function validateReference(
  shareId: string | undefined,
  keyString: string | undefined,
): ShareReference {
  if (!shareId || !keyString || !SHARE_ID_PATTERN.test(shareId) || !KEY_PATTERN.test(keyString)) {
    throw new Error('Invalid encrypted share reference');
  }
  return { shareId, keyString };
}

export function resolveShareOrigin(input: string): string {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new Error('The configured share origin is invalid');
  }
  if (
    (url.protocol !== 'https:' && !(url.protocol === 'http:' && isLoopbackHost(url.hostname))) ||
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash
  ) {
    throw new Error('The configured share origin must use HTTPS or loopback HTTP');
  }
  return url.origin;
}

function isLoopbackHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
}

async function readResponseBytes(response: Response): Promise<ArrayBuffer> {
  const declaredLength = response.headers.get('content-length');
  if (
    declaredLength !== null &&
    (!Number.isSafeInteger(Number(declaredLength)) ||
      Number(declaredLength) < 0 ||
      Number(declaredLength) > MAX_ENCRYPTED_SHARE_BYTES)
  ) {
    throw new Error('Encrypted share exceeds the download limit');
  }
  if (!response.body) {
    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > MAX_ENCRYPTED_SHARE_BYTES) {
      throw new Error('Encrypted share exceeds the download limit');
    }
    return buffer;
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_ENCRYPTED_SHARE_BYTES) {
      await reader.cancel();
      throw new Error('Encrypted share exceeds the download limit');
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes.buffer;
}

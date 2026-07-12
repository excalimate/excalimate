import { DEFAULT_SHARE_ORIGIN, resolveShareOrigin } from './shareTransport';

export interface ShareUploadResult {
  id: string;
  expiresAt: string;
  deleteSecret: string;
}

export interface ShareDeleteCapability {
  id: string;
  deleteSecret: string;
}

const SHARE_ID_PATTERN = /^[A-Za-z0-9_-]{22}$/;
const DELETE_SECRET_PATTERN = /^[A-Za-z0-9_-]{43}$/;

function shareApiUrl(): string {
  return resolveShareOrigin(import.meta.env.VITE_SHARE_API_URL ?? DEFAULT_SHARE_ORIGIN);
}

async function responseError(response: Response, fallback: string): Promise<Error> {
  let message = fallback;
  try {
    const body: unknown = await response.json();
    if (body && typeof body === 'object' && 'error' in body && typeof body.error === 'string') {
      message = body.error;
    }
  } catch {
    // The status-based fallback remains safe for non-JSON upstream errors.
  }
  return new Error(message);
}

function parseUploadResult(value: unknown): ShareUploadResult {
  if (!value || typeof value !== 'object') {
    throw new Error('Share service returned an invalid response.');
  }

  const candidate = value as Partial<ShareUploadResult>;
  const expiresAt =
    typeof candidate.expiresAt === 'string' ? Date.parse(candidate.expiresAt) : Number.NaN;
  if (
    typeof candidate.id !== 'string' ||
    !SHARE_ID_PATTERN.test(candidate.id) ||
    typeof candidate.deleteSecret !== 'string' ||
    !DELETE_SECRET_PATTERN.test(candidate.deleteSecret) ||
    !Number.isFinite(expiresAt)
  ) {
    throw new Error('Share service returned an invalid response.');
  }

  return {
    id: candidate.id,
    expiresAt: new Date(expiresAt).toISOString(),
    deleteSecret: candidate.deleteSecret,
  };
}

export async function uploadEncryptedShare(encrypted: ArrayBuffer): Promise<ShareUploadResult> {
  const response = await fetch(`${shareApiUrl()}/share`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/octet-stream' },
    body: encrypted,
  });
  if (!response.ok) {
    throw await responseError(response, `Upload failed: ${response.status}`);
  }

  return parseUploadResult(await response.json());
}

export async function deleteEncryptedShare(capability: ShareDeleteCapability): Promise<void> {
  const response = await fetch(`${shareApiUrl()}/share/${capability.id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${capability.deleteSecret}` },
  });
  if (!response.ok) {
    throw await responseError(response, `Revoke failed: ${response.status}`);
  }
}

export function buildEditorShareUrl(
  baseUrl: string,
  shareId: string,
  encryptionKey: string,
): string {
  return `${baseUrl}#share=${shareId},${encryptionKey}`;
}

export function formatShareExpiry(expiresAt: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(expiresAt));
}

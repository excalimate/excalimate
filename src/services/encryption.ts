/**
 * End-to-End Encryption utilities.
 *
 * Uses AES-GCM 128-bit encryption via the Web Crypto API.
 * The encryption key never leaves the client — it's embedded in the URL hash fragment
 * which is never sent to the server.
 *
 * Flow:
 *   Share: generateKey → encrypt(data, key) → upload(encrypted) → URL#key=base64key
 *   Load:  extractKey(URL) → download(encrypted) → decrypt(encrypted, key) → data
 */

/**
 * Generate a random AES-GCM 128-bit encryption key.
 */
export async function generateEncryptionKey(): Promise<CryptoKey> {
  return window.crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 128 },
    true, // extractable — needed to embed in URL
    ['encrypt', 'decrypt'],
  );
}

/**
 * Encrypt a JSON-serializable object with the given key.
 * Returns the encrypted data as an ArrayBuffer.
 */
export async function encryptData(data: unknown, key: CryptoKey): Promise<ArrayBuffer> {
  const plaintext = new TextEncoder().encode(JSON.stringify(data));
  // Generate a random IV for each encryption (12 bytes for AES-GCM)
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    plaintext,
  );
  // Prepend IV to ciphertext so we can extract it during decryption
  const result = new Uint8Array(iv.byteLength + encrypted.byteLength);
  result.set(iv, 0);
  result.set(new Uint8Array(encrypted), iv.byteLength);
  return result.buffer;
}

/**
 * Decrypt an ArrayBuffer with the given key.
 * Expects the IV prepended to the ciphertext (as produced by encryptData).
 */
export async function decryptData<T = unknown>(encrypted: ArrayBuffer, key: CryptoKey): Promise<T> {
  const data = new Uint8Array(encrypted);
  const iv = data.slice(0, 12);
  const ciphertext = data.slice(12);
  const decrypted = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext,
  );
  const json = new TextDecoder().decode(decrypted);
  return JSON.parse(json);
}

/**
 * Export a CryptoKey to a URL-safe base64 string.
 */
export async function exportKeyToString(key: CryptoKey): Promise<string> {
  const jwk = await window.crypto.subtle.exportKey('jwk', key);
  return jwk.k!; // The raw key material in base64url
}

/**
 * Import a CryptoKey from a URL-safe base64 string.
 */
export async function importKeyFromString(keyStr: string): Promise<CryptoKey> {
  return window.crypto.subtle.importKey(
    'jwk',
    {
      k: keyStr,
      alg: 'A128GCM',
      ext: true,
      key_ops: ['encrypt', 'decrypt'],
      kty: 'oct',
    },
    { name: 'AES-GCM', length: 128 },
    false,
    ['decrypt'],
  );
}

/**
 * Build a shareable URL with the encryption key in the hash fragment.
 * The key never reaches the server.
 */
export function buildShareUrl(baseUrl: string, shareId: string, keyStr: string): string {
  return `${baseUrl}/share/${shareId}#key=${keyStr}`;
}

/**
 * Extract the encryption key from a URL hash fragment.
 * Returns null if no key is found.
 */
export function extractKeyFromHash(hash: string): string | null {
  if (!hash || !hash.includes('key=')) return null;
  const match = hash.match(/key=([A-Za-z0-9_-]+)/);
  return match ? match[1] : null;
}

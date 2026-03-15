/**
 * End-to-End Encryption utilities.
 *
 * Uses AES-GCM 256-bit encryption via the Web Crypto API.
 * The encryption key never leaves the client — it's embedded in the URL hash fragment
 * which is never sent to the server.
 *
 * Security properties:
 *   - AES-GCM with 256-bit key (quantum-resistant equivalent ~128-bit)
 *   - Random 12-byte IV per encryption (never reused)
 *   - GCM provides authenticated encryption (integrity + confidentiality)
 *   - Key material in URL hash fragment (RFC 3986: never sent in HTTP requests)
 *   - Data compressed with gzip before encryption to minimize ciphertext size
 *
 * Flow:
 *   Share: generateKey → compress → encrypt(compressed, key) → upload(encrypted) → URL#key
 *   Load:  extractKey(URL) → download(encrypted) → decrypt(encrypted, key) → decompress → data
 */

/**
 * Generate a random AES-GCM 256-bit encryption key.
 */
export async function generateEncryptionKey(): Promise<CryptoKey> {
  return window.crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true, // extractable — needed to embed in URL
    ['encrypt', 'decrypt'],
  );
}

/**
 * Compress data with gzip via the Compression Streams API.
 */
async function compress(data: Uint8Array): Promise<Uint8Array> {
  const cs = new CompressionStream('gzip');
  const writer = cs.writable.getWriter();
  writer.write(data as unknown as BufferSource);
  writer.close();
  const reader = cs.readable.getReader();
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

/**
 * Decompress gzip data via the Compression Streams API.
 */
async function decompress(data: Uint8Array): Promise<Uint8Array> {
  const ds = new DecompressionStream('gzip');
  const writer = ds.writable.getWriter();
  writer.write(data as unknown as BufferSource);
  writer.close();
  const reader = ds.readable.getReader();
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

// Magic byte to identify compressed payloads (for backward compatibility)
const COMPRESSED_MAGIC = 0x1F; // gzip magic byte — naturally present

/**
 * Encrypt a JSON-serializable object with the given key.
 * Compresses before encrypting to minimize ciphertext size.
 * Returns the encrypted data as an ArrayBuffer.
 */
export async function encryptData(data: unknown, key: CryptoKey): Promise<ArrayBuffer> {
  const plaintext = new TextEncoder().encode(JSON.stringify(data));
  const compressed = await compress(plaintext);

  // Generate a random IV for each encryption (12 bytes for AES-GCM)
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as unknown as BufferSource },
    key,
    compressed as unknown as BufferSource,
  );
  // Layout: [IV (12 bytes)] [ciphertext]
  const result = new Uint8Array(iv.byteLength + encrypted.byteLength);
  result.set(iv, 0);
  result.set(new Uint8Array(encrypted), iv.byteLength);
  return result.buffer;
}

/**
 * Decrypt an ArrayBuffer with the given key.
 * Expects the IV prepended to the ciphertext (as produced by encryptData).
 * Handles both compressed (new) and uncompressed (legacy) payloads.
 */
export async function decryptData<T = unknown>(encrypted: ArrayBuffer, key: CryptoKey): Promise<T> {
  const data = new Uint8Array(encrypted);
  const iv = data.slice(0, 12);
  const ciphertext = data.slice(12);
  const decrypted = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as unknown as BufferSource },
    key,
    ciphertext as unknown as BufferSource,
  );
  const raw = new Uint8Array(decrypted);

  // Detect gzip magic bytes for backward compatibility with uncompressed payloads
  let plaintext: string;
  if (raw.length >= 2 && raw[0] === COMPRESSED_MAGIC && raw[1] === 0x8B) {
    const decompressed = await decompress(raw);
    plaintext = new TextDecoder().decode(decompressed);
  } else {
    plaintext = new TextDecoder().decode(raw);
  }

  return JSON.parse(plaintext);
}

/**
 * Export a CryptoKey to a URL-safe base64 string.
 */
export async function exportKeyToString(key: CryptoKey): Promise<string> {
  const raw = await window.crypto.subtle.exportKey('raw', key);
  // Encode as base64url (URL-safe, no padding) for shortest possible URL
  const bytes = new Uint8Array(raw);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Import a CryptoKey from a URL-safe base64 string.
 * Supports both 128-bit (legacy, 22 chars) and 256-bit (current, 43 chars) keys.
 */
export async function importKeyFromString(keyStr: string): Promise<CryptoKey> {
  // Decode base64url
  const base64 = keyStr.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

  const keyLength = bytes.length === 16 ? 128 : 256;

  return window.crypto.subtle.importKey(
    'raw',
    bytes as unknown as BufferSource,
    { name: 'AES-GCM', length: keyLength },
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

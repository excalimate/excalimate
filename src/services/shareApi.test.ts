import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildEditorShareUrl,
  deleteEncryptedShare,
  formatShareExpiry,
  uploadEncryptedShare,
} from './shareApi';

const shareId = 'AbCdEfGhIjKlMnOpQrStUv';
const deleteSecret = 'd'.repeat(43);
const encryptionKey = 'browser-only-encryption-key';
const expiresAt = '2030-01-02T03:04:05.000Z';

describe('share API client', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('uploads only ciphertext and parses expiry and deletion capability', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(Response.json({ id: shareId, expiresAt, deleteSecret }, { status: 201 }));
    const ciphertext = new Uint8Array([0, 12, 250, 19]).buffer;

    const result = await uploadEncryptedShare(ciphertext);

    expect(result).toEqual({ id: shareId, expiresAt, deleteSecret });
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe('https://share.excalimate.com/share');
    expect(String(url)).not.toContain(encryptionKey);
    expect(String(url)).not.toContain(deleteSecret);
    expect(init?.headers).toEqual({ 'Content-Type': 'application/octet-stream' });
    expect(init?.body).toBe(ciphertext);
  });

  it('keeps the deletion capability out of the public share URL', () => {
    const url = buildEditorShareUrl('https://app.excalimate.com/', shareId, encryptionKey);

    expect(url).toBe(`https://app.excalimate.com/#share=${shareId},${encryptionKey}`);
    expect(url).not.toContain(deleteSecret);
  });

  it('sends deletion capability only in the authorization header', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(null, { status: 204 }));

    await deleteEncryptedShare({ id: shareId, deleteSecret });

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe(`https://share.excalimate.com/share/${shareId}`);
    expect(String(url)).not.toContain(deleteSecret);
    expect(init?.headers).toEqual({ Authorization: `Bearer ${deleteSecret}` });
    expect(init?.body).toBeUndefined();
  });

  it('formats the server-provided expiry for success UX', () => {
    const formatted = formatShareExpiry(expiresAt);

    expect(formatted).toContain('2030');
    expect(formatted).not.toBe(expiresAt);
  });
});

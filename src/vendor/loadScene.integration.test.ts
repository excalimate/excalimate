import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadScene } from './loadScene';

vi.mock('@excalidraw/excalidraw', () => ({
  restore: (scene: unknown) => scene,
}));

const encoder = new TextEncoder();
const privateKey = 'AQIDBAUGBwgJCgsMDQ4PEA';
const iv = Uint8Array.from({ length: 12 }, (_, index) => index + 1);
const scene = {
  elements: [{ id: 'box', type: 'rectangle', x: 10, customData: { source: 'share' } }],
  appState: { viewBackgroundColor: '#ffffff', scrollX: 42 },
};
// A zlib-compressed fixture in the existing pako@1 share format.
const compressedContents = 'eJwdyrENwjAQRuFjAJb4aV0QRHUlsAENEqIwzhEinFxkOyHI8gysjMJrv0dEKyJaZ0wSYqs9uCpE9M0QL530KYKvGW0Nxl1nGKTPIGAEccn2jRcYzOBqa+DGmLQ72WTBGVHH4JYzPm0QlHIzsMNwTjbJ4lMr74N1rybo2NdH9RrA2Dz+wSC6oN5fwPtdKT+aWzWJ';

function packBuffers(...chunks: Uint8Array[]): Uint8Array<ArrayBuffer> {
  const result = new Uint8Array(4 + chunks.reduce((size, chunk) => size + 4 + chunk.length, 0));
  const view = new DataView(result.buffer);
  view.setUint32(0, 1);
  let offset = 4;
  for (const chunk of chunks) {
    view.setUint32(offset, chunk.length);
    offset += 4;
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

async function encrypt(data: Uint8Array<ArrayBuffer>, nonce: Uint8Array<ArrayBuffer>) {
  const key = await window.crypto.subtle.importKey(
    'jwk',
    { alg: 'A128GCM', ext: true, k: privateKey, key_ops: ['encrypt'], kty: 'oct' },
    { name: 'AES-GCM', length: 128 },
    false,
    ['encrypt'],
  );
  return new Uint8Array(await window.crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, key, data));
}

function mockBackend(payload: Uint8Array<ArrayBuffer>) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    arrayBuffer: async () => payload.buffer,
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('Excalidraw shared scenes', () => {
  it.each([
    { compressed: true, label: 'compressed' },
    { compressed: false, label: 'uncompressed' },
  ])('loads encrypted $label payloads', async ({ compressed }) => {
    const contents = packBuffers(
      encoder.encode(JSON.stringify({ version: 1 })),
      encoder.encode(JSON.stringify(scene)),
    );
    const payload = compressed
      ? Uint8Array.from(atob(compressedContents), (character) => character.charCodeAt(0))
      : contents;
    const encrypted = await encrypt(payload, iv);
    const response = packBuffers(
      encoder.encode(JSON.stringify({
        version: 2,
        compression: compressed ? 'pako@1' : null,
        encryption: 'AES-GCM',
      })),
      iv,
      encrypted,
    );
    const fetchMock = mockBackend(response);

    await expect(loadScene('scene-id', privateKey)).resolves.toEqual({
      ...scene,
      files: undefined,
    });
    expect(fetchMock).toHaveBeenCalledWith('https://json.excalidraw.com/api/v2/scene-id');
  });

  it.each([true, false])('loads legacy payloads with prefixed IV: %s', async (prefixedIv) => {
    const nonce = prefixedIv ? iv : new Uint8Array(12);
    const encrypted = await encrypt(encoder.encode(JSON.stringify(scene)), nonce);
    const response = prefixedIv
      ? Uint8Array.from([...nonce, ...encrypted])
      : encrypted;
    mockBackend(response);
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await expect(loadScene('legacy-id', privateKey)).resolves.toEqual({
      ...scene,
      files: undefined,
    });
    expect(warning).toHaveBeenCalled();
  });

  it('surfaces invalid encrypted payloads', async () => {
    mockBackend(Uint8Array.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]));
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(loadScene('invalid-id', privateKey)).rejects.toThrow();
    expect(warning).toHaveBeenCalled();
  });
});

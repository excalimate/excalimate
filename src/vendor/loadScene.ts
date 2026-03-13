/**
 * Load Excalidraw scenes from the Excalidraw sharing backend.
 * Adapted from dai-shi/excalidraw-animate (MIT License).
 *
 * Handles the #json=ID,KEY URL format used by excalidraw.com.
 * The data is encrypted with AES-GCM and compressed with pako.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { inflate } from 'pako';
import { restore } from '@excalidraw/excalidraw';
import type { ImportedDataState } from '@excalidraw/excalidraw/data/types';

const BACKEND_V2_GET = 'https://json.excalidraw.com/api/v2/';
const IV_LENGTH_BYTES = 12;
const ENCRYPTION_KEY_BITS = 128;
const CONCAT_BUFFERS_VERSION = 1;
const VERSION_DATAVIEW_BYTES = 4;
const NEXT_CHUNK_SIZE_DATAVIEW_BYTES = 4;
const DATA_VIEW_BITS_MAP = { 1: 8, 2: 16, 4: 32 } as const;

function dataView(buffer: Uint8Array, bytes: 1 | 2 | 4, offset: number): number;
function dataView(
  buffer: Uint8Array,
  bytes: 1 | 2 | 4,
  offset: number,
  value: number,
): Uint8Array;
function dataView(
  buffer: Uint8Array,
  bytes: 1 | 2 | 4,
  offset: number,
  value?: number,
): Uint8Array | number {
  if (value != null) {
    if (value > Math.pow(2, DATA_VIEW_BITS_MAP[bytes]) - 1) {
      throw new Error(
        `attempting to set value higher than the allocated bytes (value: ${value}, bytes: ${bytes})`,
      );
    }
    const method = `setUint${DATA_VIEW_BITS_MAP[bytes]}` as const;
    new DataView(buffer.buffer)[method](offset, value);
    return buffer;
  }
  const method = `getUint${DATA_VIEW_BITS_MAP[bytes]}` as const;
  return new DataView(buffer.buffer)[method](offset);
}

const splitBuffers = (concatenatedBuffer: Uint8Array) => {
  const buffers = [];
  let cursor = 0;

  const version = dataView(concatenatedBuffer, NEXT_CHUNK_SIZE_DATAVIEW_BYTES, cursor);
  if (version > CONCAT_BUFFERS_VERSION) {
    throw new Error(`invalid version ${version}`);
  }
  cursor += VERSION_DATAVIEW_BYTES;

  while (true) {
    const chunkSize = dataView(concatenatedBuffer, NEXT_CHUNK_SIZE_DATAVIEW_BYTES, cursor);
    cursor += NEXT_CHUNK_SIZE_DATAVIEW_BYTES;
    buffers.push(concatenatedBuffer.slice(cursor, cursor + chunkSize));
    cursor += chunkSize;
    if (cursor >= concatenatedBuffer.byteLength) {
      break;
    }
  }
  return buffers;
};

type FileEncodingInfo = {
  version: 1 | 2;
  compression: 'pako@1' | null;
  encryption: 'AES-GCM' | null;
};

const getCryptoKey = (key: string, usage: KeyUsage) =>
  window.crypto.subtle.importKey(
    'jwk',
    {
      alg: 'A128GCM',
      ext: true,
      k: key,
      key_ops: ['encrypt', 'decrypt'],
      kty: 'oct',
    },
    { name: 'AES-GCM', length: ENCRYPTION_KEY_BITS },
    false,
    [usage],
  );

const decryptData = async (
  iv: Uint8Array<ArrayBuffer>,
  encrypted: Uint8Array<ArrayBuffer> | ArrayBuffer,
  privateKey: string,
): Promise<ArrayBuffer> => {
  const key = await getCryptoKey(privateKey, 'decrypt');
  return window.crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, encrypted);
};

const _decryptAndDecompress = async (
  iv: Uint8Array<ArrayBuffer>,
  decryptedBuffer: Uint8Array<ArrayBuffer>,
  decryptionKey: string,
  isCompressed: boolean,
) => {
  decryptedBuffer = new Uint8Array(
    await decryptData(iv, decryptedBuffer, decryptionKey),
  );
  return isCompressed ? inflate(decryptedBuffer) : decryptedBuffer;
};

const decompressData = async <T extends Record<string, any>>(
  bufferView: Uint8Array,
  options: { decryptionKey: string },
) => {
  const [encodingMetadataBuffer, iv, buffer] = splitBuffers(bufferView);
  const encodingMetadata: FileEncodingInfo = JSON.parse(
    new TextDecoder().decode(encodingMetadataBuffer),
  );

  try {
    const [contentsMetadataBuffer, contentsBuffer] = splitBuffers(
      await _decryptAndDecompress(
        iv,
        buffer,
        options.decryptionKey,
        !!encodingMetadata.compression,
      ),
    );
    const metadata = JSON.parse(
      new TextDecoder().decode(contentsMetadataBuffer),
    ) as T;
    return { metadata, data: contentsBuffer };
  } catch (error: any) {
    console.error('Error during decompressing/decrypting:', encodingMetadata);
    throw error;
  }
};

const legacy_decodeFromBackend = async ({
  buffer,
  decryptionKey,
}: {
  buffer: ArrayBuffer;
  decryptionKey: string;
}) => {
  let decrypted: ArrayBuffer;
  try {
    const iv = buffer.slice(0, IV_LENGTH_BYTES);
    const encrypted = buffer.slice(IV_LENGTH_BYTES, buffer.byteLength);
    decrypted = await decryptData(new Uint8Array(iv), encrypted, decryptionKey);
  } catch {
    const fixedIv = new Uint8Array(IV_LENGTH_BYTES);
    decrypted = await decryptData(fixedIv, buffer, decryptionKey);
  }

  const string = new window.TextDecoder('utf-8').decode(new Uint8Array(decrypted));
  const data: ImportedDataState = JSON.parse(string);
  return {
    elements: data.elements || null,
    appState: data.appState || null,
  };
};

const importFromBackend = async (
  id: string,
  decryptionKey: string,
): Promise<ImportedDataState> => {
  try {
    const response = await fetch(`${BACKEND_V2_GET}${id}`);
    if (!response.ok) {
      throw new Error(`Backend returned ${response.status}`);
    }
    const buffer = await response.arrayBuffer();

    try {
      const { data: decodedBuffer } = await decompressData(
        new Uint8Array(buffer),
        { decryptionKey },
      );
      const data: ImportedDataState = JSON.parse(
        new TextDecoder().decode(decodedBuffer),
      );
      return {
        elements: data.elements || null,
        appState: data.appState || null,
      };
    } catch (error: any) {
      console.warn('Falling back to legacy format:', error.message);
      return legacy_decodeFromBackend({ buffer, decryptionKey });
    }
  } catch (error: any) {
    console.error('Failed to import from backend:', error);
    throw new Error(`Failed to load scene from Excalidraw: ${error.message}`);
  }
};

/**
 * Load an Excalidraw scene from the sharing backend.
 *
 * @param id - Scene ID from the URL hash
 * @param privateKey - Decryption key from the URL hash
 */
export const loadScene = async (
  id: string,
  privateKey: string,
) => {
  const data = restore(
    await importFromBackend(id, privateKey),
    null,
    null,
  );

  return {
    elements: data.elements,
    appState: data.appState,
    files: data.files,
  };
};

export { parseExcalidrawUrl } from './parseUrl';

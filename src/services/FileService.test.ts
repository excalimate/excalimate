import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  PROJECT_LIMITS,
  PROJECT_VERSION,
} from '@excalimate/project-schema';
import {
  loadShareUrl,
  parseMcpCheckpointBlob,
  parseProjectFileBlob,
} from './FileService';
import {
  decryptData,
  encryptData,
  exportKeyToString,
  generateEncryptionKey,
} from './encryption';
import {
  SYNTHETIC_V1_PROJECT,
  createSyntheticV2Project,
} from '../test-fixtures/projectDocuments';
import { createPlayerTestPackage } from '../player/playerTestFixture';
import { createShareEnvelope } from './shareEnvelope';

vi.mock('../vendor/loadScene', () => ({
  loadScene: vi.fn(),
}));

describe('FileService project ingestion', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('migrates a V1 .excanim file while preserving playback data', async () => {
    const project = await parseProjectFileBlob(
      jsonBlob(SYNTHETIC_V1_PROJECT),
    );

    expect(project.version).toBe(PROJECT_VERSION);
    expect(project.timeline).toEqual(SYNTHETIC_V1_PROJECT.timeline);
    expect(project.clipStart).toBe(SYNTHETIC_V1_PROJECT.clipStart);
    expect(project.clipEnd).toBe(SYNTHETIC_V1_PROJECT.clipEnd);
    expect(project.cameraFrame).toEqual(SYNTHETIC_V1_PROJECT.cameraFrame);
  });

  it('normalizes and validates legacy MCP checkpoint data', async () => {
    const project = await parseMcpCheckpointBlob(
      jsonBlob({
        name: 'Synthetic checkpoint',
        scene: SYNTHETIC_V1_PROJECT.scene,
        timeline: SYNTHETIC_V1_PROJECT.timeline,
        clipStart: 100,
        clipEnd: 1_800,
        cameraFrame: SYNTHETIC_V1_PROJECT.cameraFrame,
      }),
    );

    expect(project.name).toBe('Synthetic checkpoint');
    expect(project.playback.clipEnd).toBe(1_800);
  });

  it('rejects checkpoint references to missing scene elements', async () => {
    const timeline = structuredClone(SYNTHETIC_V1_PROJECT.timeline);
    timeline.tracks[0].targetId = 'missing-element';

    await expect(
      parseMcpCheckpointBlob(
        jsonBlob({ scene: SYNTHETIC_V1_PROJECT.scene, timeline }),
      ),
    ).rejects.toThrow('missing scene element');
  });

  it('rejects files before reading when their byte size exceeds the limit', async () => {
    const blob = new Blob([
      new Uint8Array(PROJECT_LIMITS.maxInputBytes + 1),
    ]);
    await expect(parseProjectFileBlob(blob)).rejects.toThrow('limit');
  });

  it('validates decrypted legacy share payloads through the shared contract', async () => {
    const key = await generateEncryptionKey();
    const keyString = await exportKeyToString(key);
    const encrypted = await encryptData(
      {
        name: 'Synthetic share',
        scene: SYNTHETIC_V1_PROJECT.scene,
        timeline: SYNTHETIC_V1_PROJECT.timeline,
        clipStart: 100,
        clipEnd: 1_800,
        cameraFrame: SYNTHETIC_V1_PROJECT.cameraFrame,
      },
      key,
    );
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(encrypted, { status: 200 })),
    );

    const project = await loadShareUrl(
      `#share=abcdefgh,${keyString}`,
    );
    expect(project.name).toBe('Synthetic share');
    expect(project.timeline).toEqual(SYNTHETIC_V1_PROJECT.timeline);
    expect(project.playback.cameraFrame).toEqual(
      SYNTHETIC_V1_PROJECT.cameraFrame,
    );
  });

  it('loads the project from a V2 project and player-package envelope', async () => {
    const key = await generateEncryptionKey();
    const keyString = await exportKeyToString(key);
    const project = createSyntheticV2Project();
    const encrypted = await encryptData(
      createShareEnvelope(project, createPlayerTestPackage()),
      key,
    );
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(encrypted, { status: 200 })),
    );

    const loaded = await loadShareUrl(`#share=abcdefgh,${keyString}`);
    expect(loaded.name).toBe(project.metadata.name);
    expect(loaded.timeline).toEqual(project.timeline);
  });

  it('rejects encrypted payloads over the centralized byte limit', async () => {
    await expect(
      decryptData(
        new ArrayBuffer(PROJECT_LIMITS.maxInputBytes + 1),
        {} as CryptoKey,
      ),
    ).rejects.toThrow('limit');
  });
});

function jsonBlob(value: unknown): Blob {
  return new Blob([JSON.stringify(value)], { type: 'application/json' });
}

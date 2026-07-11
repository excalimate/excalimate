import { describe, expect, it } from 'vitest';
import { createSyntheticV2Project } from '../test-fixtures/projectDocuments';
import {
  createShareEnvelope,
  parseShareEnvelope,
} from './shareEnvelope';
import type { PlayerPackageV1 } from '@excalimate/player-runtime';

function playerPackage(): PlayerPackageV1 {
  const project = createSyntheticV2Project();
  return {
    version: '1.0.0',
    runtimeVersion: '1.0.0',
    schemaVersion: '2.0.0',
    scene: {
      svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><g data-excalimate-id="synthetic-rectangle"><rect width="100" height="100"/></g></svg>',
    },
    animation: { timeline: project.timeline, hierarchy: {} },
    playback: {
      clipStart: project.playback.clipStart,
      clipEnd: project.playback.clipEnd,
      camera: {
        ...project.playback.cameraFrame,
        height: 675,
        sceneOffsetX: 0,
        sceneOffsetY: 0,
      },
    },
    dimensions: { width: 1920, height: 1080, aspectRatio: '16:9' },
    poster: { kind: 'frame', timeMs: project.playback.clipStart },
    attribution: {
      label: 'Made with Excalimate',
      url: 'https://excalimate.com',
    },
  };
}

describe('encrypted share envelope', () => {
  it('versions project and player package plaintext together', () => {
    const project = createSyntheticV2Project();
    const envelope = createShareEnvelope(project, playerPackage());
    const parsed = parseShareEnvelope(envelope);

    expect(parsed).toMatchObject({
      project,
      legacy: false,
    });
    expect(parsed.playerPackage?.version).toBe('1.0.0');
  });

  it('keeps project-only and V1 shares readable as legacy payloads', () => {
    const legacy = createSyntheticV2Project();
    expect(parseShareEnvelope(legacy)).toEqual({
      project: legacy,
      playerPackage: null,
      legacy: true,
    });
  });

  it('rejects malformed or unknown envelopes', () => {
    expect(() =>
      parseShareEnvelope({
        envelopeVersion: 3,
        project: {},
        playerPackage: {},
      }),
    ).toThrow('Unsupported');
    expect(() =>
      parseShareEnvelope({
        envelopeVersion: 2,
        project: {},
        playerPackage: {},
        key: 'must-not-be-accepted',
      }),
    ).toThrow('Unsupported');
  });
});

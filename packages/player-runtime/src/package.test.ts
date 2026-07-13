import { describe, expect, it } from 'vitest';
import { PLAYER_PACKAGE_LIMITS, PLAYER_PACKAGE_VERSION } from './types.js';
import {
  PlayerPackageV1Schema,
  decodePlayerPackage,
  encodePlayerPackage,
  parsePlayerPackage,
} from './package.js';
import type { PlayerPackageV1 } from './types.js';

export function createTestPlayerPackage(): PlayerPackageV1 {
  return {
    version: '1.0.0',
    runtimeVersion: '1.0.0',
    schemaVersion: '2.0.0',
    scene: {
      svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 50"><g data-excalimate-scene="true"><g data-excalimate-id="element"><rect width="10" height="10"/></g></g></svg>',
      absoluteOpacityTargetIds: ['element'],
    },
    animation: {
      timeline: {
        id: 'timeline',
        name: 'Player test',
        duration: 2_000,
        fps: 60,
        tracks: [
          {
            id: 'opacity',
            targetId: 'element',
            targetType: 'element',
            property: 'opacity',
            enabled: true,
            keyframes: [
              { id: 'start', time: 100, value: 0, easing: 'linear' },
              { id: 'end', time: 1_100, value: 1, easing: 'linear' },
            ],
          },
        ],
      },
      hierarchy: {},
    },
    playback: {
      clipStart: 100,
      clipEnd: 1_100,
      camera: {
        aspectRatio: '16:9',
        width: 100,
        height: 56.25,
        x: 50,
        y: 25,
        sceneOffsetX: 0,
        sceneOffsetY: 0,
      },
    },
    dimensions: { width: 1_920, height: 1_080, aspectRatio: '16:9' },
    poster: { kind: 'frame', timeMs: 100 },
    title: 'Test player',
    attribution: {
      label: 'Made with Excalimate',
      url: 'https://excalimate.com',
    },
  };
}

describe('PlayerPackageV1 codec', () => {
  it('round-trips a bounded package and normalizes its SVG', () => {
    const encoded = encodePlayerPackage(createTestPlayerPackage());
    const decoded = decodePlayerPackage(encoded);

    expect(decoded.version).toBe(PLAYER_PACKAGE_VERSION);
    expect(decoded.scene.svg).toContain('data-excalimate-id="element"');
    expect(decoded.scene.absoluteOpacityTargetIds).toEqual(['element']);
    expect(PlayerPackageV1Schema.safeParse(decoded).success).toBe(true);
  });

  it('rejects unknown versions and fields', () => {
    const unsupported = {
      ...createTestPlayerPackage(),
      version: '2.0.0',
    };
    expect(() => parsePlayerPackage(unsupported)).toThrow('Unsupported player package version');
    expect(() =>
      parsePlayerPackage({
        ...createTestPlayerPackage(),
        unexpected: true,
      }),
    ).toThrow('unknown fields');

    expect(() =>
      parsePlayerPackage({
        ...createTestPlayerPackage(),
        scene: {
          ...createTestPlayerPackage().scene,
          absoluteOpacityTargetIds: ['missing'],
        },
      }),
    ).toThrow('missing from the SVG scene');
  });

  it('rejects invalid limits, targets, and clip metadata', () => {
    expect(() =>
      parsePlayerPackage({
        ...createTestPlayerPackage(),
        title: 'x'.repeat(PLAYER_PACKAGE_LIMITS.maxTitleLength + 1),
      }),
    ).toThrow('title is invalid');

    const missingTarget = createTestPlayerPackage();
    missingTarget.scene.svg =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="1" height="1"/></svg>';
    expect(() => parsePlayerPackage(missingTarget)).toThrow('missing from the SVG scene');

    expect(() =>
      parsePlayerPackage({
        ...createTestPlayerPackage(),
        playback: {
          ...createTestPlayerPackage().playback,
          clipEnd: 100,
        },
      }),
    ).toThrow('clip range is invalid');
  });

  it('rejects camera and output dimensions that contradict their ratio labels', () => {
    expect(() =>
      parsePlayerPackage({
        ...createTestPlayerPackage(),
        playback: {
          ...createTestPlayerPackage().playback,
          camera: {
            ...createTestPlayerPackage().playback.camera,
            height: 100,
          },
        },
      }),
    ).toThrow('camera dimensions do not match 16:9');

    expect(() =>
      parsePlayerPackage({
        ...createTestPlayerPackage(),
        dimensions: {
          ...createTestPlayerPackage().dimensions,
          height: 1_920,
        },
      }),
    ).toThrow('output dimensions do not match 16:9');
  });

  it('rejects encoded input above the package byte budget', () => {
    const oversized = ' '.repeat(PLAYER_PACKAGE_LIMITS.maxEncodedBytes + 1);
    expect(() => decodePlayerPackage(oversized)).toThrow('exceeds the size limit');
  });

  it('rejects cyclic, ambiguous, and excessively deep hierarchies', () => {
    const cyclic = createTestPlayerPackage();
    cyclic.animation.hierarchy = { first: ['second'], second: ['first'] };
    expect(() => parsePlayerPackage(cyclic)).toThrow('contains a cycle');

    const ambiguous = createTestPlayerPackage();
    ambiguous.animation.hierarchy = {
      first: ['child'],
      second: ['child'],
      child: [],
    };
    expect(() => parsePlayerPackage(ambiguous)).toThrow('multiple parents');

    const deep = createTestPlayerPackage();
    deep.animation.hierarchy = Object.fromEntries(
      Array.from({ length: 65 }, (_, index) => [
        `group-${index}`,
        index === 64 ? [] : [`group-${index + 1}`],
      ]),
    );
    expect(() => parsePlayerPackage(deep)).toThrow('depth limit');
  });
});

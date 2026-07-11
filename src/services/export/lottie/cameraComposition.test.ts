import { describe, expect, it } from 'vitest';
import type { AnimationTrack } from '../../../types/animation';
import { buildCameraLayer } from './cameraComposition';

function cameraTrack(
  property: AnimationTrack['property'],
  values: readonly [number, number][],
): AnimationTrack {
  return {
    id: `camera-${property}`,
    targetId: '__camera_frame__',
    targetType: 'element',
    property,
    enabled: true,
    keyframes: values.map(([time, value], index) => ({
      id: `${property}-${index}`,
      time,
      value,
      easing: 'linear',
    })),
  };
}

describe('Lottie camera composition', () => {
  it('samples pan, zoom, and rotation at clip boundaries', () => {
    const layer = buildCameraLayer(
      [
        cameraTrack('translateX', [[0, 0], [2000, 100]]),
        cameraTrack('translateY', [[0, 0], [2000, 50]]),
        cameraTrack('scaleX', [[0, 1], [2000, 2]]),
        cameraTrack('scaleY', [[0, 1], [2000, 2]]),
        cameraTrack('rotation', [[0, 0], [2000, 90]]),
      ],
      1920,
      1080,
      2,
      2,
      30,
      500,
      1500,
      0,
      30,
      1,
    );
    expect(layer).not.toBeNull();
    if (
      !layer ||
      !Array.isArray(layer.ks.p.k) ||
      typeof layer.ks.p.k[0] === 'number' ||
      !Array.isArray(layer.ks.s.k) ||
      typeof layer.ks.s.k[0] === 'number' ||
      !Array.isArray(layer.ks.r.k)
    ) {
      throw new Error('Expected animated camera transforms');
    }
    expect(layer.ks.p.k[0]?.t).toBe(0);
    expect(layer.ks.p.k[0]?.s).toEqual([920, 520, 0]);
    expect(layer.ks.s.k[0]?.s).toEqual([80, 80, 100]);
    expect(layer.ks.r.k[0]?.s).toEqual([-22.5]);
    expect(layer.ks.r.k.at(-1)?.s).toEqual([-67.5]);
  });
});

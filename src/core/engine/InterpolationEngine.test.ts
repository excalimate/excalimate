import { describe, it, expect } from 'vitest';
import { interpolate, findKeyframeIndexBefore, interpolateTracks } from './InterpolationEngine';
import type { Keyframe, AnimatableProperty } from '../../types/animation';

function kf(time: number, value: number, easing: Keyframe['easing'] = 'linear'): Keyframe {
  return { id: `kf-${time}`, time, value, easing };
}

describe('findKeyframeIndexBefore', () => {
  const keyframes = [kf(0, 0), kf(100, 1), kf(200, 2), kf(300, 3)];

  it('returns -1 when time is before all keyframes', () => {
    expect(findKeyframeIndexBefore(keyframes, -10)).toBe(-1);
  });

  it('returns 0 for time at first keyframe', () => {
    expect(findKeyframeIndexBefore(keyframes, 0)).toBe(0);
  });

  it('returns correct index for time between keyframes', () => {
    expect(findKeyframeIndexBefore(keyframes, 50)).toBe(0);
    expect(findKeyframeIndexBefore(keyframes, 150)).toBe(1);
    expect(findKeyframeIndexBefore(keyframes, 250)).toBe(2);
  });

  it('returns last index for time at last keyframe', () => {
    expect(findKeyframeIndexBefore(keyframes, 300)).toBe(3);
  });

  it('returns last index for time after all keyframes', () => {
    expect(findKeyframeIndexBefore(keyframes, 500)).toBe(3);
  });

  it('handles single keyframe', () => {
    expect(findKeyframeIndexBefore([kf(100, 1)], 50)).toBe(-1);
    expect(findKeyframeIndexBefore([kf(100, 1)], 100)).toBe(0);
    expect(findKeyframeIndexBefore([kf(100, 1)], 200)).toBe(0);
  });

  it('handles empty array', () => {
    expect(findKeyframeIndexBefore([], 100)).toBe(-1);
  });
});

describe('interpolate', () => {
  const property: AnimatableProperty = 'opacity';

  it('returns default for empty keyframes', () => {
    expect(interpolate([], 500, 'opacity')).toBe(1);
    expect(interpolate([], 500, 'translateX')).toBe(0);
    expect(interpolate([], 500, 'scaleX')).toBe(1);
    expect(interpolate([], 500, 'rotation')).toBe(0);
  });

  it('returns value for single keyframe regardless of time', () => {
    const keyframes = [kf(100, 0.5)];
    expect(interpolate(keyframes, 0, property)).toBe(0.5);
    expect(interpolate(keyframes, 100, property)).toBe(0.5);
    expect(interpolate(keyframes, 200, property)).toBe(0.5);
  });

  it('clamps to first keyframe value before first keyframe', () => {
    const keyframes = [kf(100, 0.2), kf(200, 0.8)];
    expect(interpolate(keyframes, 0, property)).toBe(0.2);
    expect(interpolate(keyframes, 50, property)).toBe(0.2);
  });

  it('clamps to last keyframe value after last keyframe', () => {
    const keyframes = [kf(100, 0.2), kf(200, 0.8)];
    expect(interpolate(keyframes, 200, property)).toBe(0.8);
    expect(interpolate(keyframes, 300, property)).toBe(0.8);
  });

  it('linearly interpolates between two keyframes', () => {
    const keyframes = [kf(0, 0), kf(100, 1)];
    expect(interpolate(keyframes, 0, property)).toBe(0);
    expect(interpolate(keyframes, 25, property)).toBeCloseTo(0.25);
    expect(interpolate(keyframes, 50, property)).toBeCloseTo(0.5);
    expect(interpolate(keyframes, 75, property)).toBeCloseTo(0.75);
    expect(interpolate(keyframes, 100, property)).toBe(1);
  });

  it('handles multiple keyframes', () => {
    const keyframes = [kf(0, 0), kf(100, 10), kf(200, 5)];
    expect(interpolate(keyframes, 50, property)).toBeCloseTo(5);
    expect(interpolate(keyframes, 100, property)).toBe(10);
    expect(interpolate(keyframes, 150, property)).toBeCloseTo(7.5);
    expect(interpolate(keyframes, 200, property)).toBe(5);
  });

  it('applies easeInQuad easing', () => {
    const keyframes = [kf(0, 0, 'easeInQuad'), kf(100, 1)];
    // easeInQuad: t^2, so at t=0.5 → 0.25
    expect(interpolate(keyframes, 50, property)).toBeCloseTo(0.25);
  });

  it('applies step easing', () => {
    const keyframes = [kf(0, 0, 'step'), kf(100, 1)];
    // step: 0 until t=1, then 1
    expect(interpolate(keyframes, 0, property)).toBe(0);
    expect(interpolate(keyframes, 50, property)).toBeCloseTo(0);
    expect(interpolate(keyframes, 99, property)).toBeCloseTo(0);
    expect(interpolate(keyframes, 100, property)).toBe(1);
  });

  it('handles keyframes with same time (picks exact match)', () => {
    const keyframes = [kf(0, 0), kf(100, 5)];
    expect(interpolate(keyframes, 100, property)).toBe(5);
  });

  it('interpolates negative values', () => {
    const keyframes = [kf(0, -10), kf(100, 10)];
    expect(interpolate(keyframes, 50, property)).toBeCloseTo(0);
  });

  it('interpolates with large values', () => {
    const keyframes = [kf(0, 0), kf(1000, 1000)];
    expect(interpolate(keyframes, 500, property)).toBeCloseTo(500);
  });
});

describe('interpolateTracks', () => {
  it('returns defaults when no tracks provided', () => {
    const result = interpolateTracks([], 500);
    expect(result.opacity).toBe(1);
    expect(result.translateX).toBe(0);
    expect(result.scaleX).toBe(1);
    expect(result.rotation).toBe(0);
  });

  it('interpolates multiple tracks independently', () => {
    const tracks = [
      { property: 'opacity' as AnimatableProperty, keyframes: [kf(0, 0), kf(100, 1)] },
      { property: 'translateX' as AnimatableProperty, keyframes: [kf(0, 0), kf(100, 200)] },
      { property: 'rotation' as AnimatableProperty, keyframes: [kf(0, 0), kf(100, 360)] },
    ];
    const result = interpolateTracks(tracks, 50);
    expect(result.opacity).toBeCloseTo(0.5);
    expect(result.translateX).toBeCloseTo(100);
    expect(result.rotation).toBeCloseTo(180);
    // Untouched properties keep defaults
    expect(result.translateY).toBe(0);
    expect(result.scaleX).toBe(1);
    expect(result.scaleY).toBe(1);
  });
});

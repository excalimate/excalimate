import { describe, expect, it } from 'vitest';
import type {
  AnimatableProperty,
  AnimationTimeline,
  EasingType,
} from '@excalimate/project-schema';
import { createFrameSampler } from './sampler.js';

function track(
  property: AnimatableProperty,
  values: readonly [number, number, EasingType?][],
  targetId = 'element',
  enabled = true,
) {
  return {
    id: `${targetId}-${property}`,
    targetId,
    targetType: targetId === 'group' ? ('group' as const) : ('element' as const),
    property,
    enabled,
    keyframes: values.map(([time, value, easing = 'linear'], index) => ({
      id: `${targetId}-${property}-${index}`,
      time,
      value,
      easing,
    })),
  };
}

function timeline(
  tracks: AnimationTimeline['tracks'],
): AnimationTimeline {
  return {
    id: 'timeline',
    name: 'Sampler contract',
    duration: 10_000,
    fps: 60,
    tracks,
  };
}

describe('export frame sampler', () => {
  it('uses one compiled contract for every property and exact endpoints', () => {
    const sampler = createFrameSampler({
      timeline: timeline([
        track('opacity', [[0, 0], [1000, 1]]),
        track('translateX', [[0, 0], [1000, 100]]),
        track('translateY', [[0, 0], [1000, -50]]),
        track('scaleX', [[0, 1], [1000, 2]]),
        track('scaleY', [[0, 1], [1000, 0.5]]),
        track('rotation', [[0, 0], [1000, 90]]),
        track('drawProgress', [[0, 0], [1000, 1]]),
      ]),
      clipStart: 0,
      clipEnd: 1000,
      fps: 10,
    });

    expect(sampler.frameCount).toBe(10);
    expect(sampler.sampleCount).toBe(11);
    expect(sampler.timeForFrame(5)).toBe(500);
    expect(sampler.timeForFrame(10)).toBe(1000);
    expect(sampler.sampleFrame(5).get('element')).toMatchObject({
      opacity: 0.5,
      translateX: 50,
      translateY: -25,
      scaleX: 1.5,
      scaleY: 0.75,
      rotation: 45,
      drawProgress: 0.5,
    });
  });

  it('composes nested groups and ignores disabled or empty tracks', () => {
    const sampler = createFrameSampler({
      timeline: timeline([
        track('translateX', [[0, 100]], 'group'),
        track('translateX', [[0, 25]], 'element'),
        track('opacity', [[0, 0]], 'disabled', false),
        track('rotation', [], 'empty'),
      ]),
      hierarchy: { group: ['element'] },
      clipStart: 200,
      clipEnd: 400,
      fps: 30,
    });

    expect(sampler.sampleAt(300).get('element')?.translateX).toBe(125);
    expect(sampler.sampleAt(300).has('disabled')).toBe(false);
    expect(sampler.sampleAt(300).has('empty')).toBe(false);
  });

  it('clamps arbitrary samples to the selected clip', () => {
    const sampler = createFrameSampler({
      timeline: timeline([
        track('opacity', [[0, 0], [1000, 1]]),
      ]),
      clipStart: 250,
      clipEnd: 750,
      fps: 24,
    });

    expect(sampler.sampleAt(-100).get('element')?.opacity).toBeCloseTo(0.25);
    expect(sampler.sampleAt(2000).get('element')?.opacity).toBeCloseTo(0.75);
    expect(() => sampler.sampleFrame(14)).toThrow(RangeError);
  });
});

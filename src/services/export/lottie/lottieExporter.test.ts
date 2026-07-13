import { describe, expect, it } from 'vitest';
import { createFrameSampler } from '@excalimate/export-runtime';
import type { AnimationTrack } from '../../../types/animation';
import { generateLottie, sampleCanonicalProperties } from './lottieExporter';

function track(
  targetId: string,
  targetType: AnimationTrack['targetType'],
  property: AnimationTrack['property'],
  start: number,
  end: number,
): AnimationTrack {
  return {
    id: `${targetId}-${property}`,
    targetId,
    targetType,
    property,
    enabled: true,
    keyframes: [
      { id: 'start', time: 0, value: start, easing: 'linear' },
      { id: 'end', time: 1_000, value: end, easing: 'linear' },
    ],
  };
}

describe('Lottie composition bounds', () => {
  it('includes the exact clip-end sample in the exclusive out point', async () => {
    const timeline = {
      id: 'timeline',
      name: 'Endpoint',
      duration: 1_000,
      fps: 10,
      tracks: [],
    };
    const sampler = createFrameSampler({
      timeline,
      clipStart: 0,
      clipEnd: 1_000,
      fps: 10,
    });

    const animation = await generateLottie({
      elements: [],
      targets: [],
      tracks: [],
      files: {},
      fps: 10,
      clipStart: 0,
      clipEnd: 1_000,
      cameraFrame: { x: 50, y: 28.125, width: 100, height: 56.25 },
      width: 1_920,
      height: 1_080,
      sampler,
    });

    expect(sampler.frameCount).toBe(10);
    expect(sampler.sampleCount).toBe(11);
    expect(animation.op).toBe(11);
  });

  it('flattens grouped transforms from canonical composed frame samples', () => {
    const timeline = {
      id: 'timeline',
      name: 'Grouped',
      duration: 1_000,
      fps: 2,
      tracks: [
        track('group', 'group', 'scaleX', 1, 2),
        track('element', 'element', 'translateX', 10, 20),
      ],
    };
    const sampler = createFrameSampler({
      timeline,
      hierarchy: { group: ['element'] },
      clipStart: 0,
      clipEnd: 1_000,
      fps: 2,
    });

    const properties = sampleCanonicalProperties(
      sampler,
      new Set(['element']),
      new Map(),
    ).get('element');

    expect(properties?.translateX.map(({ value }) => value)).toEqual([10, 22.5, 40]);
    expect(properties?.scaleX.map(({ value }) => value)).toEqual([1, 1.5, 2]);
  });
});

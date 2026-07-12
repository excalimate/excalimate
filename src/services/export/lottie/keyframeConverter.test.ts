import { describe, expect, it } from 'vitest';
import type { AnimationTrack } from '../../../types/animation';
import {
  buildTransform,
  buildTrimPath,
  groupTracksByProperty,
} from './keyframeConverter';
import type {
  LottieKeyframe,
  LottieMultiValue,
} from './types';

function track(
  property: AnimationTrack['property'],
  values: readonly [number, number][],
  easing: AnimationTrack['keyframes'][number]['easing'] = 'linear',
): AnimationTrack {
  return {
    id: property,
    targetId: 'element',
    targetType: 'element',
    property,
    enabled: true,
    keyframes: values.map(([time, value], index) => ({
      id: `${property}-${index}`,
      time,
      value,
      easing,
    })),
  };
}

describe('Lottie compiled-timeline mappings', () => {
  it('interpolates every property at merged transform times', () => {
    const props = groupTracksByProperty(
      [
        track('translateX', [[0, 0], [1000, 100]]),
        track('translateY', [[0, 0], [500, 50], [1000, 0]]),
        track('scaleX', [[0, 1], [1000, 2]]),
        track('scaleY', [[0, 1], [1000, 0.5]]),
      ],
      'element',
    );
    const transform = buildTransform(
      10,
      20,
      0,
      100,
      props,
      30,
      0,
      1000,
    );
    const positionKeyframes = animatedMultiKeyframes(transform.p);
    const midpoint = positionKeyframes.find((keyframe) => keyframe.t === 15);
    expect(midpoint?.s).toEqual([60, 70, 0]);
    const scaleKeyframes = animatedMultiKeyframes(transform.s);
    expect(scaleKeyframes.at(-1)?.s).toEqual([200, 50, 100]);
  });

  function animatedMultiKeyframes(
    value: LottieMultiValue,
  ): LottieKeyframe[] {
    if (!Array.isArray(value.k) || !isLottieKeyframeArray(value.k)) {
      throw new Error('Expected animated multi-value keyframes');
    }
    return value.k;
  }

  function isLottieKeyframeArray(
    value: number[] | LottieKeyframe[],
  ): value is LottieKeyframe[] {
    return value.every((item) => typeof item !== 'number');
  }

  it('clips tracks with sampled boundary values and preserves base opacity', () => {
    const props = groupTracksByProperty(
      [
        track('opacity', [[0, 0], [2000, 1]]),
        track('rotation', [[0, 0], [2000, 180]]),
      ],
      'element',
    );
    const transform = buildTransform(
      0,
      0,
      10,
      40,
      props,
      30,
      500,
      1500,
    );
    if (!Array.isArray(transform.o.k) || !Array.isArray(transform.r.k)) {
      throw new Error('Expected animated opacity and rotation');
    }
    expect(transform.o.k[0]?.t).toBe(0);
    expect(transform.o.k[0]?.s).toEqual([10]);
    expect(transform.o.k.at(-1)?.s).toEqual([30]);
    expect(transform.r.k[0]?.s).toEqual([55]);
    expect(transform.r.k.at(-1)?.s).toEqual([145]);
  });

  it('maps draw progress to a clipped trim path', () => {
    const props = groupTracksByProperty(
      [track('drawProgress', [[0, 0], [2000, 1]])],
      'element',
    );
    const trim = buildTrimPath(props, 20, 500, 1500);
    expect(trim).not.toBeNull();
    if (!trim || !Array.isArray(trim.e.k)) {
      throw new Error('Expected animated trim path');
    }
    expect(trim.e.k[0]?.s).toEqual([25]);
    expect(trim.e.k.at(-1)?.s).toEqual([75]);
  });

  it('samples independent nonlinear transform curves without collapsing their easing', () => {
    const props = groupTracksByProperty(
      [
        track('translateX', [[0, 0], [1000, 100]], 'easeIn'),
        track('translateY', [[0, 0], [1000, 100]], 'easeOut'),
      ],
      'element',
    );
    const transform = buildTransform(0, 0, 0, 100, props, 30, 0, 1000);
    const midpoint = animatedMultiKeyframes(transform.p).find(
      (keyframe) => keyframe.t === 15,
    );

    expect(midpoint?.s[0]).toBeCloseTo(29.2893, 3);
    expect(midpoint?.s[1]).toBeCloseTo(70.7107, 3);
    expect(midpoint?.i).toEqual(getLinearHandles().i);
    expect(midpoint?.o).toEqual(getLinearHandles().o);
  });

  it('preserves nonlinear progress when a clip begins mid-segment', () => {
    const props = groupTracksByProperty(
      [track('rotation', [[0, 0], [1000, 100]], 'easeIn')],
      'element',
    );
    const transform = buildTransform(0, 0, 0, 100, props, 30, 500, 1000);
    if (!Array.isArray(transform.r.k)) {
      throw new Error('Expected animated rotation');
    }
    const before = transform.r.k.filter((keyframe) => keyframe.t <= 7.5).at(-1);
    const after = transform.r.k.find((keyframe) => keyframe.t >= 7.5);
    if (!before || !after) throw new Error('Expected samples around the clipped midpoint');
    const fraction = (7.5 - before.t) / (after.t - before.t);
    const midpoint =
      before.t === after.t
        ? before.s[0]
        : before.s[0] + (after.s[0] - before.s[0]) * fraction;

    expect(transform.r.k[0]?.s[0]).toBeCloseTo(29.2893, 3);
    expect(Math.abs(midpoint - 61.7317)).toBeLessThan(0.25);
    expect(transform.r.k.at(-1)?.s[0]).toBeCloseTo(100, 3);
  });

  function getLinearHandles(): {
    i: { x: number[]; y: number[] };
    o: { x: number[]; y: number[] };
  } {
    return {
      i: { x: [1], y: [1] },
      o: { x: [0], y: [0] },
    };
  }
});

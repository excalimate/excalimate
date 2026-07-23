import { getEasingFunction } from '@excalimate/animation-core';
import type { EasingType } from '@excalimate/animation-core';

export function sampleEasingProgresses(
  easingType: EasingType,
  tolerance: number,
  maxSamples: number,
): number[] {
  if (easingType === 'linear') return [0, 1];

  const easing = getEasingFunction(easingType);
  const points = new Map<number, number>([
    [0, easing(0)],
    [1, easing(1)],
  ]);
  const intervals: Array<readonly [number, number]> = [];
  if (maxSamples > 2) {
    points.set(0.5, easing(0.5));
    intervals.push([0, 0.5], [0.5, 1]);
  } else {
    intervals.push([0, 1]);
  }
  while (points.size < maxSamples) {
    let selected:
      | {
          start: number;
          end: number;
          midpoint: number;
          midpointValue: number;
          error: number;
        }
      | undefined;
    for (const [start, end] of intervals) {
      const startValue = points.get(start) ?? easing(start);
      const endValue = points.get(end) ?? easing(end);
      let split = (start + end) / 2;
      let splitValue = easing(split);
      let maximumError = 0;
      for (const fraction of [0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875]) {
        const probe = start + (end - start) * fraction;
        const actual = easing(probe);
        const linear = startValue + (endValue - startValue) * fraction;
        const error = Math.abs(actual - linear);
        if (error > maximumError) {
          maximumError = error;
          split = probe;
          splitValue = actual;
        }
      }
      if (
        maximumError > tolerance &&
        (!selected ||
          maximumError > selected.error ||
          (maximumError === selected.error && start < selected.start))
      ) {
        selected = {
          start,
          end,
          midpoint: split,
          midpointValue: splitValue,
          error: maximumError,
        };
      }
    }
    if (!selected) break;
    const intervalIndex = intervals.findIndex(
      ([start, end]) => start === selected.start && end === selected.end,
    );
    if (intervalIndex < 0) break;
    points.set(selected.midpoint, selected.midpointValue);
    intervals.splice(
      intervalIndex,
      1,
      [selected.start, selected.midpoint],
      [selected.midpoint, selected.end],
    );
  }
  return [...points.keys()].sort((left, right) => left - right);
}

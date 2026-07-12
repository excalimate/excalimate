import { getEasingFunction } from '@excalimate/animation-core';
import { describe, expect, it } from 'vitest';
import { sampleEasingProgresses } from './easingSamples';

function maxInterpolationError(samples: readonly number[], easingType: 'easeInOutBack'): number {
  const easing = getEasingFunction(easingType);
  let maximum = 0;
  for (let index = 1; index < samples.length; index += 1) {
    const start = samples[index - 1];
    const end = samples[index];
    for (const fraction of [0.25, 0.5, 0.75]) {
      const progress = start + (end - start) * fraction;
      const linear = easing(start) + (easing(end) - easing(start)) * fraction;
      maximum = Math.max(maximum, Math.abs(easing(progress) - linear));
    }
  }
  return maximum;
}

describe('adaptive easing samples', () => {
  it('refines the globally highest-error intervals under a tight budget', () => {
    const samples = sampleEasingProgresses('easeInOutBack', 0.0001, 10);

    expect(samples).toHaveLength(10);
    expect(samples.some((sample) => sample > 0.5 && sample < 1)).toBe(true);
    expect(maxInterpolationError(samples, 'easeInOutBack')).toBeLessThan(0.08);
  });
});

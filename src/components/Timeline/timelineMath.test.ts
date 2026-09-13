import { describe, expect, it } from 'vitest';
import { computeTicks } from './timelineMath';

describe('computeTicks', () => {
  it('keeps adaptive ruler and grid ticks aligned to output frames', () => {
    const ticks = computeTicks(5000, 24, 0.5, 0, 1000);

    expect(ticks.length).toBeGreaterThan(0);
    for (const tick of ticks) {
      expect((tick.time * 24) / 1000).toBeCloseTo(tick.frame, 10);
    }
    expect(ticks.some((tick) => tick.major && tick.label === '1s')).toBe(true);
  });

  it('does not emit ticks past the duration boundary', () => {
    const ticks = computeTicks(950, 60, 1, 0, 2000);

    expect(Math.max(...ticks.map((tick) => tick.time))).toBeLessThanOrEqual(950);
  });
});

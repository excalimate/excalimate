import { describe, it, expect } from 'vitest';
import {
  linear,
  easeIn,
  easeOut,
  easeInOut,
  easeInQuad,
  easeOutQuad,
  easeInOutQuad,
  easeInCubic,
  easeOutCubic,
  easeInOutCubic,
  easeInBack,
  easeOutBack,
  easeInOutBack,
  easeInElastic,
  easeOutElastic,
  easeInBounce,
  easeOutBounce,
  step,
  getEasingFunction,
} from './EasingFunctions';
import { cubicBezier } from './CubicBezier';

const EPSILON = 1e-6;

const allEasings = [
  { name: 'linear', fn: linear },
  { name: 'easeIn', fn: easeIn },
  { name: 'easeOut', fn: easeOut },
  { name: 'easeInOut', fn: easeInOut },
  { name: 'easeInQuad', fn: easeInQuad },
  { name: 'easeOutQuad', fn: easeOutQuad },
  { name: 'easeInOutQuad', fn: easeInOutQuad },
  { name: 'easeInCubic', fn: easeInCubic },
  { name: 'easeOutCubic', fn: easeOutCubic },
  { name: 'easeInOutCubic', fn: easeInOutCubic },
  { name: 'easeInBack', fn: easeInBack },
  { name: 'easeOutBack', fn: easeOutBack },
  { name: 'easeInOutBack', fn: easeInOutBack },
  { name: 'easeInElastic', fn: easeInElastic },
  { name: 'easeOutElastic', fn: easeOutElastic },
  { name: 'easeInBounce', fn: easeInBounce },
  { name: 'easeOutBounce', fn: easeOutBounce },
];

describe('Easing Functions', () => {
  describe('boundary conditions (t=0 → 0, t=1 → 1)', () => {
    for (const { name, fn } of allEasings) {
      it(`${name}(0) ≈ 0`, () => {
        expect(Math.abs(fn(0))).toBeLessThan(EPSILON);
      });
      it(`${name}(1) ≈ 1`, () => {
        expect(Math.abs(fn(1) - 1)).toBeLessThan(EPSILON);
      });
    }
  });

  describe('linear', () => {
    it('returns t unchanged', () => {
      expect(linear(0)).toBe(0);
      expect(linear(0.25)).toBe(0.25);
      expect(linear(0.5)).toBe(0.5);
      expect(linear(0.75)).toBe(0.75);
      expect(linear(1)).toBe(1);
    });
  });

  describe('step', () => {
    it('returns 0 for t < 1', () => {
      expect(step(0)).toBe(0);
      expect(step(0.5)).toBe(0);
      expect(step(0.999)).toBe(0);
    });
    it('returns 1 for t = 1', () => {
      expect(step(1)).toBe(1);
    });
  });

  describe('quadratic', () => {
    it('easeInQuad(0.5) = 0.25', () => {
      expect(easeInQuad(0.5)).toBeCloseTo(0.25);
    });
    it('easeOutQuad(0.5) = 0.75', () => {
      expect(easeOutQuad(0.5)).toBeCloseTo(0.75);
    });
    it('easeInOutQuad(0.5) = 0.5 (symmetry)', () => {
      expect(easeInOutQuad(0.5)).toBeCloseTo(0.5);
    });
  });

  describe('cubic', () => {
    it('easeInCubic(0.5) = 0.125', () => {
      expect(easeInCubic(0.5)).toBeCloseTo(0.125);
    });
    it('easeOutCubic(0.5) = 0.875', () => {
      expect(easeOutCubic(0.5)).toBeCloseTo(0.875);
    });
    it('easeInOutCubic(0.5) = 0.5 (symmetry)', () => {
      expect(easeInOutCubic(0.5)).toBeCloseTo(0.5);
    });
  });

  describe('back (overshoot)', () => {
    it('easeInBack produces negative values near start', () => {
      expect(easeInBack(0.2)).toBeLessThan(0);
    });
    it('easeOutBack produces values > 1 near end', () => {
      expect(easeOutBack(0.8)).toBeGreaterThan(1);
    });
  });

  describe('elastic', () => {
    it('easeInElastic produces values outside [0,1]', () => {
      const values = Array.from({ length: 9 }, (_, i) => easeInElastic((i + 1) / 10));
      const hasNegative = values.some((v) => v < 0);
      expect(hasNegative).toBe(true);
    });
    it('easeOutElastic produces values outside [0,1]', () => {
      const values = Array.from({ length: 9 }, (_, i) => easeOutElastic((i + 1) / 10));
      const hasOvershoot = values.some((v) => v > 1);
      expect(hasOvershoot).toBe(true);
    });
  });

  describe('bounce', () => {
    it('easeOutBounce stays within [0, 1]', () => {
      for (let i = 0; i <= 100; i++) {
        const t = i / 100;
        const v = easeOutBounce(t);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1 + EPSILON);
      }
    });
    it('easeInBounce stays within [0, 1]', () => {
      for (let i = 0; i <= 100; i++) {
        const t = i / 100;
        const v = easeInBounce(t);
        expect(v).toBeGreaterThanOrEqual(-EPSILON);
        expect(v).toBeLessThanOrEqual(1 + EPSILON);
      }
    });
  });

  describe('getEasingFunction', () => {
    it('returns correct function for each easing type', () => {
      expect(getEasingFunction('linear')).toBe(linear);
      expect(getEasingFunction('easeInQuad')).toBe(easeInQuad);
      expect(getEasingFunction('step')).toBe(step);
    });
  });
});

describe('CubicBezier', () => {
  it('linear cubic bezier (0, 0, 1, 1)', () => {
    const ease = cubicBezier(0, 0, 1, 1);
    expect(ease(0)).toBe(0);
    expect(ease(0.5)).toBeCloseTo(0.5, 4);
    expect(ease(1)).toBe(1);
  });

  it('ease-in-out cubic bezier (0.42, 0, 0.58, 1)', () => {
    const ease = cubicBezier(0.42, 0, 0.58, 1);
    expect(ease(0)).toBe(0);
    expect(ease(1)).toBe(1);
    // Midpoint should be close to 0.5 (symmetric curve)
    expect(ease(0.5)).toBeCloseTo(0.5, 1);
  });

  it('boundary values', () => {
    const ease = cubicBezier(0.25, 0.1, 0.25, 1);
    expect(ease(0)).toBe(0);
    expect(ease(1)).toBe(1);
  });

  it('overshoot with y values outside [0, 1]', () => {
    const ease = cubicBezier(0.68, -0.55, 0.27, 1.55);
    expect(ease(0)).toBe(0);
    expect(ease(1)).toBe(1);
  });

  it('throws for x values outside [0, 1]', () => {
    expect(() => cubicBezier(-0.1, 0, 1, 1)).toThrow(RangeError);
    expect(() => cubicBezier(0, 0, 1.1, 1)).toThrow(RangeError);
  });

  it('produces monotonically increasing output for standard curves', () => {
    const ease = cubicBezier(0.25, 0.1, 0.25, 1);
    let prev = -Infinity;
    for (let i = 0; i <= 100; i++) {
      const t = i / 100;
      const v = ease(t);
      // Allow small floating point deviations near overshoots
      expect(v).toBeGreaterThanOrEqual(prev - 0.01);
      prev = v;
    }
  });
});

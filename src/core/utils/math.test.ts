// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  clamp,
  lerp,
  inverseLerp,
  remap,
  degreesToRadians,
  radiansToDegrees,
  approxEqual,
  snapToGrid,
  distance,
  formatTime,
  parseTime,
} from './math';

describe('clamp', () => {
  it('returns value when within range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });

  it('returns min when value is below', () => {
    expect(clamp(-5, 0, 10)).toBe(0);
  });

  it('returns max when value is above', () => {
    expect(clamp(15, 0, 10)).toBe(10);
  });

  it('handles min === max', () => {
    expect(clamp(5, 3, 3)).toBe(3);
  });

  it('returns min when value equals min', () => {
    expect(clamp(0, 0, 10)).toBe(0);
  });

  it('returns max when value equals max', () => {
    expect(clamp(10, 0, 10)).toBe(10);
  });
});

describe('lerp', () => {
  it('returns a when t=0', () => {
    expect(lerp(10, 20, 0)).toBe(10);
  });

  it('returns b when t=1', () => {
    expect(lerp(10, 20, 1)).toBe(20);
  });

  it('returns midpoint when t=0.5', () => {
    expect(lerp(10, 20, 0.5)).toBe(15);
  });

  it('extrapolates when t > 1', () => {
    expect(lerp(0, 10, 2)).toBe(20);
  });

  it('extrapolates when t < 0', () => {
    expect(lerp(0, 10, -1)).toBe(-10);
  });

  it('works with negative ranges', () => {
    expect(lerp(-10, -20, 0.5)).toBe(-15);
  });
});

describe('inverseLerp', () => {
  it('returns 0 when value equals a', () => {
    expect(inverseLerp(10, 20, 10)).toBe(0);
  });

  it('returns 1 when value equals b', () => {
    expect(inverseLerp(10, 20, 20)).toBe(1);
  });

  it('returns 0.5 at midpoint', () => {
    expect(inverseLerp(10, 20, 15)).toBe(0.5);
  });

  it('returns 0 when a === b', () => {
    expect(inverseLerp(5, 5, 5)).toBe(0);
  });

  it('is the inverse of lerp', () => {
    const a = 10;
    const b = 30;
    const t = 0.75;
    const value = lerp(a, b, t);
    expect(inverseLerp(a, b, value)).toBeCloseTo(t);
  });
});

describe('remap', () => {
  it('maps value from one range to another', () => {
    expect(remap(5, 0, 10, 0, 100)).toBe(50);
  });

  it('maps to inverse range', () => {
    expect(remap(5, 0, 10, 100, 0)).toBe(50);
  });

  it('maps boundary values', () => {
    expect(remap(0, 0, 10, 20, 40)).toBe(20);
    expect(remap(10, 0, 10, 20, 40)).toBe(40);
  });

  it('handles different range sizes', () => {
    expect(remap(50, 0, 100, 0, 1)).toBeCloseTo(0.5);
  });
});

describe('degreesToRadians', () => {
  it('converts 0 degrees', () => {
    expect(degreesToRadians(0)).toBe(0);
  });

  it('converts 90 degrees', () => {
    expect(degreesToRadians(90)).toBeCloseTo(Math.PI / 2);
  });

  it('converts 180 degrees', () => {
    expect(degreesToRadians(180)).toBeCloseTo(Math.PI);
  });

  it('converts 360 degrees', () => {
    expect(degreesToRadians(360)).toBeCloseTo(2 * Math.PI);
  });

  it('converts negative degrees', () => {
    expect(degreesToRadians(-90)).toBeCloseTo(-Math.PI / 2);
  });
});

describe('radiansToDegrees', () => {
  it('converts 0 radians', () => {
    expect(radiansToDegrees(0)).toBe(0);
  });

  it('converts π/2 radians', () => {
    expect(radiansToDegrees(Math.PI / 2)).toBeCloseTo(90);
  });

  it('converts π radians', () => {
    expect(radiansToDegrees(Math.PI)).toBeCloseTo(180);
  });

  it('converts 2π radians', () => {
    expect(radiansToDegrees(2 * Math.PI)).toBeCloseTo(360);
  });

  it('converts negative radians', () => {
    expect(radiansToDegrees(-Math.PI)).toBeCloseTo(-180);
  });
});

describe('approxEqual', () => {
  it('returns true for exact match', () => {
    expect(approxEqual(1.0, 1.0)).toBe(true);
  });

  it('returns true for values within epsilon', () => {
    expect(approxEqual(1.0, 1.0 + 1e-10)).toBe(true);
  });

  it('returns false for values outside epsilon', () => {
    expect(approxEqual(1.0, 1.1)).toBe(false);
  });

  it('accepts custom epsilon', () => {
    expect(approxEqual(1.0, 1.05, 0.1)).toBe(true);
    expect(approxEqual(1.0, 1.2, 0.1)).toBe(false);
  });

  it('handles floating point arithmetic', () => {
    expect(approxEqual(0.1 + 0.2, 0.3)).toBe(true);
  });
});

describe('snapToGrid', () => {
  it('snaps to nearest multiple', () => {
    expect(snapToGrid(7, 5)).toBe(5);
    expect(snapToGrid(8, 5)).toBe(10);
  });

  it('returns exact value on grid', () => {
    expect(snapToGrid(10, 5)).toBe(10);
  });

  it('handles step of 1', () => {
    expect(snapToGrid(3.7, 1)).toBe(4);
  });

  it('handles negative values', () => {
    expect(snapToGrid(-7, 5)).toBe(-5);
    expect(snapToGrid(-8, 5)).toBe(-10);
  });

  it('handles step of 0 (returns value unchanged)', () => {
    expect(snapToGrid(7, 0)).toBe(7);
  });

  it('handles fractional steps', () => {
    expect(snapToGrid(0.35, 0.25)).toBeCloseTo(0.25);
    expect(snapToGrid(0.38, 0.25)).toBeCloseTo(0.5);
  });
});

describe('distance', () => {
  it('returns 0 for same point', () => {
    expect(distance(0, 0, 0, 0)).toBe(0);
  });

  it('calculates unit distance on x axis', () => {
    expect(distance(0, 0, 1, 0)).toBe(1);
  });

  it('calculates unit distance on y axis', () => {
    expect(distance(0, 0, 0, 1)).toBe(1);
  });

  it('calculates diagonal distance', () => {
    expect(distance(0, 0, 3, 4)).toBe(5);
  });

  it('handles negative coordinates', () => {
    expect(distance(-1, -1, 2, 3)).toBe(5);
  });
});

describe('formatTime', () => {
  it('formats 0ms', () => {
    expect(formatTime(0)).toBe('0.000');
  });

  it('formats 1000ms as 1 second', () => {
    expect(formatTime(1000)).toBe('1.000');
  });

  it('formats 61000ms with minutes', () => {
    expect(formatTime(61000)).toBe('1:01.000');
  });

  it('formats fractional milliseconds', () => {
    expect(formatTime(1500)).toBe('1.500');
  });

  it('formats complex time', () => {
    expect(formatTime(83456)).toBe('1:23.456');
  });

  it('formats negative values', () => {
    expect(formatTime(-1500)).toBe('-1.500');
  });

  it('formats negative values with minutes', () => {
    expect(formatTime(-61000)).toBe('-1:01.000');
  });
});

describe('parseTime', () => {
  it('parses mm:ss.mmm format', () => {
    expect(parseTime('1:23.456')).toBe(83456);
  });

  it('parses mm:ss format', () => {
    expect(parseTime('1:23')).toBe(83000);
  });

  it('parses seconds with decimals', () => {
    expect(parseTime('83.456')).toBeCloseTo(83456);
  });

  it('parses plain seconds', () => {
    expect(parseTime('5')).toBe(5000);
  });

  it('parses ms suffix', () => {
    expect(parseTime('83456ms')).toBe(83456);
  });

  it('returns null for invalid input', () => {
    expect(parseTime('')).toBeNull();
    expect(parseTime('abc')).toBeNull();
    expect(parseTime(':::')).toBeNull();
  });

  it('returns null for invalid seconds in mm:ss', () => {
    expect(parseTime('1:75')).toBeNull();
  });

  it('handles whitespace', () => {
    expect(parseTime('  1:23.456  ')).toBe(83456);
  });
});

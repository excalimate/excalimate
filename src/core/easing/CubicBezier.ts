/**
 * Custom cubic-bezier easing curve implementation.
 * Uses Newton-Raphson iteration for evaluating the parametric curve.
 */

import type { EasingFunction } from './EasingFunctions';

const NEWTON_ITERATIONS = 8;
const NEWTON_MIN_SLOPE = 0.001;
const SUBDIVISION_PRECISION = 0.0000001;
const SUBDIVISION_MAX_ITERATIONS = 10;

function calcBezier(aT: number, a1: number, a2: number): number {
  return (((1 - 3 * a2 + 3 * a1) * aT + (3 * a2 - 6 * a1)) * aT + 3 * a1) * aT;
}

function getSlope(aT: number, a1: number, a2: number): number {
  return (3 * (1 - 3 * a2 + 3 * a1) * aT + 2 * (3 * a2 - 6 * a1)) * aT + 3 * a1;
}

function binarySubdivide(aX: number, aA: number, aB: number, mX1: number, mX2: number): number {
  let currentX: number;
  let currentT: number;
  let i = 0;
  do {
    currentT = aA + (aB - aA) / 2;
    currentX = calcBezier(currentT, mX1, mX2) - aX;
    if (currentX > 0) {
      aB = currentT;
    } else {
      aA = currentT;
    }
  } while (Math.abs(currentX) > SUBDIVISION_PRECISION && ++i < SUBDIVISION_MAX_ITERATIONS);
  return currentT;
}

function newtonRaphsonIterate(aX: number, aGuessT: number, mX1: number, mX2: number): number {
  for (let i = 0; i < NEWTON_ITERATIONS; ++i) {
    const currentSlope = getSlope(aGuessT, mX1, mX2);
    if (currentSlope === 0) return aGuessT;
    const currentX = calcBezier(aGuessT, mX1, mX2) - aX;
    aGuessT -= currentX / currentSlope;
  }
  return aGuessT;
}

/**
 * Create a cubic-bezier easing function.
 * Control points: (x1, y1) and (x2, y2).
 * Start (0, 0) and end (1, 1) are implicit.
 *
 * @param x1 - X of first control point (0..1)
 * @param y1 - Y of first control point (can be outside 0..1 for overshoot)
 * @param x2 - X of second control point (0..1)
 * @param y2 - Y of second control point (can be outside 0..1 for overshoot)
 */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number): EasingFunction {
  if (x1 < 0 || x1 > 1 || x2 < 0 || x2 > 1) {
    throw new RangeError('Cubic bezier x values must be between 0 and 1');
  }

  // Linear case
  if (x1 === y1 && x2 === y2) {
    return (t: number) => t;
  }

  // Pre-compute sample table for fast lookup
  const SAMPLE_TABLE_SIZE = 11;
  const SAMPLE_STEP_SIZE = 1.0 / (SAMPLE_TABLE_SIZE - 1);
  const sampleValues = new Float32Array(SAMPLE_TABLE_SIZE);
  for (let i = 0; i < SAMPLE_TABLE_SIZE; ++i) {
    sampleValues[i] = calcBezier(i * SAMPLE_STEP_SIZE, x1, x2);
  }

  function getTForX(aX: number): number {
    let intervalStart = 0;
    let currentSample = 1;
    const lastSample = SAMPLE_TABLE_SIZE - 1;

    for (; currentSample !== lastSample && sampleValues[currentSample] <= aX; ++currentSample) {
      intervalStart += SAMPLE_STEP_SIZE;
    }
    --currentSample;

    const dist =
      (aX - sampleValues[currentSample]) /
      (sampleValues[currentSample + 1] - sampleValues[currentSample]);
    const guessForT = intervalStart + dist * SAMPLE_STEP_SIZE;
    const initialSlope = getSlope(guessForT, x1, x2);

    if (initialSlope >= NEWTON_MIN_SLOPE) {
      return newtonRaphsonIterate(aX, guessForT, x1, x2);
    } else if (initialSlope === 0) {
      return guessForT;
    } else {
      return binarySubdivide(aX, intervalStart, intervalStart + SAMPLE_STEP_SIZE, x1, x2);
    }
  }

  return function bezierEasing(t: number): number {
    if (t === 0) return 0;
    if (t === 1) return 1;
    return calcBezier(getTForX(t), y1, y2);
  };
}

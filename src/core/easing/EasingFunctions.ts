/**
 * Complete library of easing functions for animation interpolation.
 * Each function maps t ∈ [0, 1] → [0, 1] (approximately).
 * Some functions like elastic/back may overshoot outside [0, 1].
 */

export type EasingFunction = (t: number) => number;

// --- Linear ---
export const linear: EasingFunction = (t) => t;

// --- Quadratic ---
export const easeInQuad: EasingFunction = (t) => t * t;
export const easeOutQuad: EasingFunction = (t) => t * (2 - t);
export const easeInOutQuad: EasingFunction = (t) =>
  t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

// --- Cubic ---
export const easeInCubic: EasingFunction = (t) => t * t * t;
export const easeOutCubic: EasingFunction = (t) => --t * t * t + 1;
export const easeInOutCubic: EasingFunction = (t) =>
  t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;

// --- Sine (generic ease in/out/inout) ---
export const easeIn: EasingFunction = (t) => 1 - Math.cos((t * Math.PI) / 2);
export const easeOut: EasingFunction = (t) => Math.sin((t * Math.PI) / 2);
export const easeInOut: EasingFunction = (t) => -(Math.cos(Math.PI * t) - 1) / 2;

// --- Back ---
const BACK_OVERSHOOT = 1.70158;
const BACK_OVERSHOOT_INOUT = BACK_OVERSHOOT * 1.525;

export const easeInBack: EasingFunction = (t) =>
  t * t * ((BACK_OVERSHOOT + 1) * t - BACK_OVERSHOOT);
export const easeOutBack: EasingFunction = (t) => {
  const t1 = t - 1;
  return t1 * t1 * ((BACK_OVERSHOOT + 1) * t1 + BACK_OVERSHOOT) + 1;
};
export const easeInOutBack: EasingFunction = (t) => {
  if (t < 0.5) {
    return ((2 * t) ** 2 * ((BACK_OVERSHOOT_INOUT + 1) * 2 * t - BACK_OVERSHOOT_INOUT)) / 2;
  }
  return (
    ((2 * t - 2) ** 2 * ((BACK_OVERSHOOT_INOUT + 1) * (t * 2 - 2) + BACK_OVERSHOOT_INOUT) + 2) /
    2
  );
};

// --- Elastic ---
const ELASTIC_P = (2 * Math.PI) / 3;

export const easeInElastic: EasingFunction = (t) => {
  if (t === 0 || t === 1) return t;
  return -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * ELASTIC_P);
};
export const easeOutElastic: EasingFunction = (t) => {
  if (t === 0 || t === 1) return t;
  return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ELASTIC_P) + 1;
};

// --- Bounce ---
export const easeOutBounce: EasingFunction = (t) => {
  const n1 = 7.5625;
  const d1 = 2.75;
  if (t < 1 / d1) {
    return n1 * t * t;
  } else if (t < 2 / d1) {
    return n1 * (t -= 1.5 / d1) * t + 0.75;
  } else if (t < 2.5 / d1) {
    return n1 * (t -= 2.25 / d1) * t + 0.9375;
  } else {
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  }
};

export const easeInBounce: EasingFunction = (t) => 1 - easeOutBounce(1 - t);

// --- Step ---
export const step: EasingFunction = (t) => (t >= 1 ? 1 : 0);

// --- Registry ---
import type { EasingType } from '../../types/animation';

const EASING_MAP: Record<EasingType, EasingFunction> = {
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
};

/**
 * Retrieve an easing function by its type name.
 * Returns `linear` for unknown types as a safe fallback.
 */
export function getEasingFunction(type: EasingType): EasingFunction {
  return EASING_MAP[type] ?? linear;
}

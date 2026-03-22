/**
 * Easing name → Lottie cubic bezier handles.
 *
 * Lottie keyframes use { i: { x, y }, o: { x, y } } for easing.
 * - `o` = out-tangent of the START keyframe
 * - `i` = in-tangent of the END keyframe
 *
 * Values are normalized 0–1 representing the bezier control points.
 */

export interface LottieEasing {
  /** In-tangent (on the receiving keyframe) */
  i: { x: number[]; y: number[] };
  /** Out-tangent (on the sending keyframe) */
  o: { x: number[]; y: number[] };
}

const EASING_MAP: Record<string, LottieEasing> = {
  linear: {
    o: { x: [0], y: [0] },
    i: { x: [1], y: [1] },
  },
  easeIn: {
    o: { x: [0.42], y: [0] },
    i: { x: [1], y: [1] },
  },
  easeOut: {
    o: { x: [0], y: [0] },
    i: { x: [0.58], y: [1] },
  },
  easeInOut: {
    o: { x: [0.42], y: [0] },
    i: { x: [0.58], y: [1] },
  },
  easeInQuad: {
    o: { x: [0.55], y: [0.085] },
    i: { x: [1], y: [1] },
  },
  easeOutQuad: {
    o: { x: [0], y: [0] },
    i: { x: [0.25], y: [1] },
  },
  easeInOutQuad: {
    o: { x: [0.455], y: [0.03] },
    i: { x: [0.515], y: [0.955] },
  },
  easeInCubic: {
    o: { x: [0.32], y: [0] },
    i: { x: [1], y: [1] },
  },
  easeOutCubic: {
    o: { x: [0], y: [0] },
    i: { x: [0.68], y: [1] },
  },
  easeInOutCubic: {
    o: { x: [0.65], y: [0] },
    i: { x: [0.35], y: [1] },
  },
  easeInBack: {
    o: { x: [0.6], y: [-0.28] },
    i: { x: [1], y: [1] },
  },
  easeOutBack: {
    o: { x: [0], y: [0] },
    i: { x: [0.34], y: [1.56] },
  },
  easeInOutBack: {
    o: { x: [0.68], y: [-0.55] },
    i: { x: [0.27], y: [1.55] },
  },
  easeInElastic: {
    // Approximation — elastic effects are hard to represent as a single bezier
    o: { x: [0.5], y: [-0.5] },
    i: { x: [1], y: [1] },
  },
  easeOutElastic: {
    o: { x: [0], y: [0] },
    i: { x: [0.5], y: [1.5] },
  },
  easeInBounce: {
    // Approximation — bounce needs multiple segments, simplified here
    o: { x: [0.6], y: [0] },
    i: { x: [1], y: [0.9] },
  },
  easeOutBounce: {
    o: { x: [0], y: [0.1] },
    i: { x: [0.4], y: [1] },
  },
  step: {
    // Hold/step: instant jump at the end
    o: { x: [1], y: [0] },
    i: { x: [1], y: [1] },
  },
};

/** Get Lottie easing handles for a named easing. Falls back to linear. */
export function getEasing(name: string): LottieEasing {
  return EASING_MAP[name] ?? EASING_MAP.linear;
}

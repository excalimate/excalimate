import type { EasingType } from '@excalimate/project-schema';

export type EasingFunction = (time: number) => number;

export const linear: EasingFunction = (time) => time;
export const easeInQuad: EasingFunction = (time) => time * time;
export const easeOutQuad: EasingFunction = (time) => time * (2 - time);
export const easeInOutQuad: EasingFunction = (time) =>
  time < 0.5 ? 2 * time * time : -1 + (4 - 2 * time) * time;
export const easeInCubic: EasingFunction = (time) => time * time * time;
export const easeOutCubic: EasingFunction = (time) => {
  const shifted = time - 1;
  return shifted * shifted * shifted + 1;
};
export const easeInOutCubic: EasingFunction = (time) =>
  time < 0.5
    ? 4 * time * time * time
    : (time - 1) * (2 * time - 2) * (2 * time - 2) + 1;
export const easeIn: EasingFunction = (time) =>
  1 - Math.cos((time * Math.PI) / 2);
export const easeOut: EasingFunction = (time) =>
  Math.sin((time * Math.PI) / 2);
export const easeInOut: EasingFunction = (time) =>
  -(Math.cos(Math.PI * time) - 1) / 2;

const BACK_OVERSHOOT = 1.70158;
const BACK_OVERSHOOT_IN_OUT = BACK_OVERSHOOT * 1.525;
const ELASTIC_PERIOD = (2 * Math.PI) / 3;

export const easeInBack: EasingFunction = (time) =>
  time * time * ((BACK_OVERSHOOT + 1) * time - BACK_OVERSHOOT);
export const easeOutBack: EasingFunction = (time) => {
  const shifted = time - 1;
  return (
    shifted *
      shifted *
      ((BACK_OVERSHOOT + 1) * shifted + BACK_OVERSHOOT) +
    1
  );
};
export const easeInOutBack: EasingFunction = (time) => {
  if (time < 0.5) {
    return (
      ((2 * time) ** 2 *
        ((BACK_OVERSHOOT_IN_OUT + 1) * 2 * time -
          BACK_OVERSHOOT_IN_OUT)) /
      2
    );
  }
  return (
    ((2 * time - 2) ** 2 *
      ((BACK_OVERSHOOT_IN_OUT + 1) * (time * 2 - 2) +
        BACK_OVERSHOOT_IN_OUT) +
      2) /
    2
  );
};
export const easeInElastic: EasingFunction = (time) => {
  if (time === 0 || time === 1) return time;
  return (
    -Math.pow(2, 10 * time - 10) *
    Math.sin((time * 10 - 10.75) * ELASTIC_PERIOD)
  );
};
export const easeOutElastic: EasingFunction = (time) => {
  if (time === 0 || time === 1) return time;
  return (
    Math.pow(2, -10 * time) *
      Math.sin((time * 10 - 0.75) * ELASTIC_PERIOD) +
    1
  );
};
export const easeOutBounce: EasingFunction = (time) => {
  const numerator = 7.5625;
  const denominator = 2.75;
  let shifted = time;
  if (shifted < 1 / denominator) return numerator * shifted * shifted;
  if (shifted < 2 / denominator) {
    shifted -= 1.5 / denominator;
    return numerator * shifted * shifted + 0.75;
  }
  if (shifted < 2.5 / denominator) {
    shifted -= 2.25 / denominator;
    return numerator * shifted * shifted + 0.9375;
  }
  shifted -= 2.625 / denominator;
  return numerator * shifted * shifted + 0.984375;
};
export const easeInBounce: EasingFunction = (time) =>
  1 - easeOutBounce(1 - time);
export const step: EasingFunction = (time) => (time >= 1 ? 1 : 0);

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

export function getEasingFunction(type: EasingType): EasingFunction {
  return EASING_MAP[type] ?? linear;
}

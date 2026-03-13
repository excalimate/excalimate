/**
 * Keyframe interpolation engine.
 * Performs binary search to find surrounding keyframes,
 * then applies easing functions for smooth interpolation.
 */

import type { Keyframe, AnimatableProperty } from '../../types/animation';
import { PROPERTY_DEFAULTS } from '../../types/animation';
import { getEasingFunction } from '../easing/EasingFunctions';
import { clamp, lerp } from '../utils/math';

/**
 * Binary search to find the index of the last keyframe with time <= target.
 * Returns -1 if target is before all keyframes.
 * Keyframes must be sorted by time (ascending).
 */
export function findKeyframeIndexBefore(keyframes: readonly Keyframe[], time: number): number {
  let lo = 0;
  let hi = keyframes.length - 1;
  let result = -1;

  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    if (keyframes[mid].time <= time) {
      result = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }

  return result;
}

/**
 * Interpolate a value from a sorted array of keyframes at the given time.
 *
 * Behavior:
 * - No keyframes → returns property default
 * - Before first keyframe → clamps to first keyframe value
 * - After last keyframe → clamps to last keyframe value
 * - Exactly on a keyframe → returns that keyframe's value
 * - Between keyframes → interpolates using the left keyframe's easing
 */
export function interpolate(
  keyframes: readonly Keyframe[],
  time: number,
  property: AnimatableProperty,
): number {
  if (keyframes.length === 0) {
    return PROPERTY_DEFAULTS[property];
  }

  if (keyframes.length === 1) {
    return keyframes[0].value;
  }

  // Before first keyframe
  if (time <= keyframes[0].time) {
    return keyframes[0].value;
  }

  // After last keyframe
  if (time >= keyframes[keyframes.length - 1].time) {
    return keyframes[keyframes.length - 1].value;
  }

  // Binary search for the surrounding keyframes
  const leftIdx = findKeyframeIndexBefore(keyframes, time);
  const rightIdx = leftIdx + 1;

  // Exact match
  if (keyframes[leftIdx].time === time) {
    return keyframes[leftIdx].value;
  }

  const left = keyframes[leftIdx];
  const right = keyframes[rightIdx];

  // Calculate normalized progress between the two keyframes
  const duration = right.time - left.time;
  const elapsed = time - left.time;
  const t = clamp(elapsed / duration, 0, 1);

  // Apply easing function (from the left keyframe)
  const easingFn = getEasingFunction(left.easing);
  const easedT = easingFn(t);

  // Interpolate the value
  return lerp(left.value, right.value, easedT);
}

/**
 * Interpolate all values for a set of tracks at a given time.
 * Returns a record of property → value.
 */
export function interpolateTracks(
  tracks: ReadonlyArray<{ property: AnimatableProperty; keyframes: readonly Keyframe[] }>,
  time: number,
): Record<AnimatableProperty, number> {
  const result = { ...PROPERTY_DEFAULTS };

  for (const track of tracks) {
    result[track.property] = interpolate(track.keyframes, time, track.property);
  }

  return result;
}

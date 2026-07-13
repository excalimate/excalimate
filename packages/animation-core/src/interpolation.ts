import type {
  AnimatableProperty,
  Keyframe,
} from '@excalimate/project-schema';
import { getEasingFunction } from './easing.js';
import type { CompiledTrack } from './types.js';
import { PROPERTY_DEFAULTS } from './types.js';

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function lerp(start: number, end: number, time: number): number {
  return start + (end - start) * time;
}

export function findKeyframeIndexBefore(
  keyframes: readonly Keyframe[],
  time: number,
): number {
  let low = 0;
  let high = keyframes.length - 1;
  let result = -1;
  while (low <= high) {
    const middle = (low + high) >>> 1;
    const keyframe = keyframes[middle];
    if (keyframe && keyframe.time <= time) {
      result = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }
  return result;
}

export function interpolate(
  keyframes: readonly Keyframe[],
  time: number,
  property: AnimatableProperty,
): number {
  if (keyframes.length === 0) return PROPERTY_DEFAULTS[property];
  if (keyframes.length === 1) return keyframes[0]?.value ?? PROPERTY_DEFAULTS[property];
  const first = keyframes[0];
  const last = keyframes[keyframes.length - 1];
  if (!first || !last) return PROPERTY_DEFAULTS[property];
  if (time <= first.time) return first.value;
  if (time >= last.time) return last.value;
  const leftIndex = findKeyframeIndexBefore(keyframes, time);
  const left = keyframes[leftIndex];
  const right = keyframes[leftIndex + 1];
  if (!left || !right) return last.value;
  if (left.time === time) return left.value;
  const progress = clamp(
    (time - left.time) / (right.time - left.time),
    0,
    1,
  );
  return lerp(
    left.value,
    right.value,
    getEasingFunction(left.easing)(progress),
  );
}

export function interpolateCompiledTrack(
  track: CompiledTrack,
  time: number,
): number {
  const first = track.keyframes[0];
  const last = track.keyframes[track.keyframes.length - 1];
  if (!first || !last) return PROPERTY_DEFAULTS[track.property];
  if (time <= first.time) return first.value;
  if (time >= last.time) return last.value;

  let low = 0;
  let high = track.segments.length - 1;
  let segmentIndex = 0;
  while (low <= high) {
    const middle = (low + high) >>> 1;
    const segment = track.segments[middle];
    if (!segment) break;
    if (time < segment.startTime) {
      high = middle - 1;
    } else if (time >= segment.endTime) {
      low = middle + 1;
    } else {
      segmentIndex = middle;
      break;
    }
  }
  const segment = track.segments[segmentIndex];
  if (!segment) return last.value;
  const progress = clamp(
    (time - segment.startTime) * segment.inverseDuration,
    0,
    1,
  );
  return lerp(
    segment.startValue,
    segment.endValue,
    getEasingFunction(segment.easing)(progress),
  );
}

export function interpolateTracks(
  tracks: ReadonlyArray<{
    property: AnimatableProperty;
    keyframes: readonly Keyframe[];
  }>,
  time: number,
): Record<AnimatableProperty, number> {
  const result = { ...PROPERTY_DEFAULTS };
  for (const track of tracks) {
    result[track.property] = interpolate(track.keyframes, time, track.property);
  }
  return result;
}

import { nanoid } from 'nanoid';
import type { Keyframe, EasingType } from '../../types/animation';
import { EASING_TYPES } from '../../types/animation';

export function createKeyframe(
  time: number,
  value: number,
  easing: EasingType = 'linear',
): Keyframe {
  return { id: nanoid(), time, value, easing };
}

export function validateKeyframe(kf: unknown): kf is Keyframe {
  if (typeof kf !== 'object' || kf === null) return false;

  const obj = kf as Record<string, unknown>;

  if (typeof obj.id !== 'string' || obj.id.length === 0) return false;
  if (typeof obj.time !== 'number' || !Number.isFinite(obj.time) || obj.time < 0)
    return false;
  if (typeof obj.value !== 'number' || !Number.isFinite(obj.value)) return false;
  if (
    typeof obj.easing !== 'string' ||
    !(EASING_TYPES as readonly string[]).includes(obj.easing)
  )
    return false;

  return true;
}

export function sortKeyframes(keyframes: Keyframe[]): Keyframe[] {
  return [...keyframes].sort((a, b) => a.time - b.time);
}

export function findKeyframeIndex(keyframes: Keyframe[], id: string): number {
  return keyframes.findIndex((kf) => kf.id === id);
}

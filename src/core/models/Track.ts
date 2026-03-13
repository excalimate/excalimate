import { nanoid } from 'nanoid';
import type {
  AnimationTrack,
  AnimatableProperty,
  Keyframe,
} from '../../types/animation';
import { ANIMATABLE_PROPERTIES } from '../../types/animation';
import { sortKeyframes, validateKeyframe } from './Keyframe';

export function createTrack(
  targetId: string,
  targetType: 'element' | 'group',
  property: AnimatableProperty,
): AnimationTrack {
  return {
    id: nanoid(),
    targetId,
    targetType,
    property,
    keyframes: [],
    enabled: true,
  };
}

export function addKeyframeToTrack(
  track: AnimationTrack,
  keyframe: Keyframe,
): AnimationTrack {
  return {
    ...track,
    keyframes: sortKeyframes([...track.keyframes, keyframe]),
  };
}

export function removeKeyframeFromTrack(
  track: AnimationTrack,
  keyframeId: string,
): AnimationTrack {
  return {
    ...track,
    keyframes: track.keyframes.filter((kf) => kf.id !== keyframeId),
  };
}

export function updateKeyframeInTrack(
  track: AnimationTrack,
  keyframeId: string,
  updates: Partial<Omit<Keyframe, 'id'>>,
): AnimationTrack {
  return {
    ...track,
    keyframes: sortKeyframes(
      track.keyframes.map((kf) =>
        kf.id === keyframeId ? { ...kf, ...updates } : kf,
      ),
    ),
  };
}

export function validateTrack(track: unknown): track is AnimationTrack {
  if (typeof track !== 'object' || track === null) return false;

  const obj = track as Record<string, unknown>;

  if (typeof obj.id !== 'string' || obj.id.length === 0) return false;
  if (typeof obj.targetId !== 'string' || obj.targetId.length === 0) return false;
  if (obj.targetType !== 'element' && obj.targetType !== 'group') return false;
  if (
    typeof obj.property !== 'string' ||
    !(ANIMATABLE_PROPERTIES as readonly string[]).includes(obj.property)
  )
    return false;
  if (typeof obj.enabled !== 'boolean') return false;
  if (!Array.isArray(obj.keyframes)) return false;
  if (!obj.keyframes.every((kf: unknown) => validateKeyframe(kf))) return false;

  return true;
}

import {
  ANIMATABLE_PROPERTIES,
  AnimationTimelineSchema,
  EASING_TYPES,
} from '@excalimate/project-schema';
import type {
  AnimatableProperty,
  AnimationTimeline,
  AnimationTrack,
  EasingType,
  Keyframe,
} from '@excalimate/project-schema';

export function createKeyframeWithId(
  id: string,
  time: number,
  value: number,
  easing: EasingType = 'linear',
): Keyframe {
  return { id, time, value, easing };
}

export function sortKeyframes(
  keyframes: readonly Keyframe[],
): Keyframe[] {
  return [...keyframes].sort(
    (left, right) => left.time - right.time || left.id.localeCompare(right.id),
  );
}

export function addKeyframeToTrack(
  track: AnimationTrack,
  keyframe: Keyframe,
): AnimationTrack {
  return { ...track, keyframes: sortKeyframes([...track.keyframes, keyframe]) };
}

export function removeKeyframeFromTrack(
  track: AnimationTrack,
  keyframeId: string,
): AnimationTrack {
  return {
    ...track,
    keyframes: track.keyframes.filter((keyframe) => keyframe.id !== keyframeId),
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
      track.keyframes.map((keyframe) =>
        keyframe.id === keyframeId
          ? { ...keyframe, ...updates }
          : keyframe,
      ),
    ),
  };
}

export function addTrackToTimeline(
  timeline: AnimationTimeline,
  track: AnimationTrack,
): AnimationTimeline {
  return { ...timeline, tracks: [...timeline.tracks, track] };
}

export function removeTrackFromTimeline(
  timeline: AnimationTimeline,
  trackId: string,
): AnimationTimeline {
  return {
    ...timeline,
    tracks: timeline.tracks.filter((track) => track.id !== trackId),
  };
}

export function updateTrackInTimeline(
  timeline: AnimationTimeline,
  trackId: string,
  updates: Partial<Omit<AnimationTrack, 'id'>>,
): AnimationTimeline {
  return {
    ...timeline,
    tracks: timeline.tracks.map((track) =>
      track.id === trackId ? { ...track, ...updates } : track,
    ),
  };
}

export function findTracksForTarget(
  timeline: AnimationTimeline,
  targetId: string,
): AnimationTrack[] {
  return timeline.tracks.filter((track) => track.targetId === targetId);
}

export function validateKeyframe(value: unknown): value is Keyframe {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Readonly<Record<string, unknown>>;
  return (
    typeof record['id'] === 'string' &&
    record['id'].length > 0 &&
    typeof record['time'] === 'number' &&
    Number.isFinite(record['time']) &&
    record['time'] >= 0 &&
    typeof record['value'] === 'number' &&
    Number.isFinite(record['value']) &&
    typeof record['easing'] === 'string' &&
    (EASING_TYPES as readonly string[]).includes(record['easing'])
  );
}

export function validateTrack(value: unknown): value is AnimationTrack {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Readonly<Record<string, unknown>>;
  return (
    typeof record['id'] === 'string' &&
    record['id'].length > 0 &&
    typeof record['targetId'] === 'string' &&
    record['targetId'].length > 0 &&
    (record['targetType'] === 'element' || record['targetType'] === 'group') &&
    typeof record['property'] === 'string' &&
    (ANIMATABLE_PROPERTIES as readonly string[]).includes(record['property']) &&
    typeof record['enabled'] === 'boolean' &&
    Array.isArray(record['keyframes']) &&
    record['keyframes'].every(validateKeyframe)
  );
}

export function validateTimeline(
  value: unknown,
): value is AnimationTimeline {
  return AnimationTimelineSchema.safeParse(value).success;
}

export function findKeyframeIndex(
  keyframes: readonly Keyframe[],
  id: string,
): number {
  return keyframes.findIndex((keyframe) => keyframe.id === id);
}

export function isAnimatableProperty(
  value: string,
): value is AnimatableProperty {
  return (ANIMATABLE_PROPERTIES as readonly string[]).includes(value);
}

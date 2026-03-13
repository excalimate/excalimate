import { nanoid } from 'nanoid';
import type { AnimationTimeline, AnimationTrack } from '../../types/animation';
import { validateTrack } from './Track';

export function createTimeline(
  name: string = 'Animation 1',
  duration: number = 30000,
  fps: number = 60,
): AnimationTimeline {
  return { id: nanoid(), name, duration, fps, tracks: [] };
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
    tracks: timeline.tracks.filter((t) => t.id !== trackId),
  };
}

export function updateTrackInTimeline(
  timeline: AnimationTimeline,
  trackId: string,
  updates: Partial<Omit<AnimationTrack, 'id'>>,
): AnimationTimeline {
  return {
    ...timeline,
    tracks: timeline.tracks.map((t) =>
      t.id === trackId ? { ...t, ...updates } : t,
    ),
  };
}

export function findTracksForTarget(
  timeline: AnimationTimeline,
  targetId: string,
): AnimationTrack[] {
  return timeline.tracks.filter((t) => t.targetId === targetId);
}

export function validateTimeline(
  timeline: unknown,
): timeline is AnimationTimeline {
  if (typeof timeline !== 'object' || timeline === null) return false;

  const obj = timeline as Record<string, unknown>;

  if (typeof obj.id !== 'string' || obj.id.length === 0) return false;
  if (typeof obj.name !== 'string') return false;
  if (
    typeof obj.duration !== 'number' ||
    !Number.isFinite(obj.duration) ||
    obj.duration <= 0
  )
    return false;
  if (typeof obj.fps !== 'number' || !Number.isFinite(obj.fps) || obj.fps <= 0)
    return false;
  if (!Array.isArray(obj.tracks)) return false;
  if (!obj.tracks.every((t: unknown) => validateTrack(t))) return false;

  return true;
}

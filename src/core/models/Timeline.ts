import { nanoid } from 'nanoid';
import { AnimationTimelineSchema } from '@excalimate/project-schema';
import type { AnimationTimeline, AnimationTrack } from '../../types/animation';

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
  return AnimationTimelineSchema.safeParse(timeline).success;
}

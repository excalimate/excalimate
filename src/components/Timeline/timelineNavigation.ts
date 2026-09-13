import type { AnimationTrack } from '../../types/animation';

export type TimelineNavigationDirection = 'previous' | 'next';
export type TimelineFrameShortcut = 'PageUp' | 'PageDown' | 'shift+PageUp' | 'shift+PageDown';

export function getFrameShortcutNavigation(shortcut: TimelineFrameShortcut): {
  direction: TimelineNavigationDirection;
  frameCount: number;
} {
  switch (shortcut) {
    case 'PageUp':
      return { direction: 'previous', frameCount: 1 };
    case 'PageDown':
      return { direction: 'next', frameCount: 1 };
    case 'shift+PageUp':
      return { direction: 'previous', frameCount: 10 };
    case 'shift+PageDown':
      return { direction: 'next', frameCount: 10 };
  }
}

export function moveTimeByFrames(params: {
  currentTime: number;
  duration: number;
  fps: number;
  frameCount: number;
  direction: TimelineNavigationDirection;
}): number {
  const { currentTime, duration, fps, frameCount, direction } = params;
  const safeFps = Math.max(1, fps);
  const delta = (1000 / safeFps) * Math.max(0, frameCount);
  const signedDelta = direction === 'previous' ? -delta : delta;
  return Math.min(duration, Math.max(0, currentTime + signedDelta));
}

export function getRelevantTimelineTargets(params: {
  tracks: readonly AnimationTrack[];
  selectedTargetIds: readonly string[];
  clipStart: number;
  clipEnd: number;
  duration: number;
}): number[] {
  const { tracks, selectedTargetIds, clipStart, clipEnd, duration } = params;
  const selectedIds = new Set(selectedTargetIds);
  const scopedTracks =
    selectedIds.size > 0 ? tracks.filter((track) => selectedIds.has(track.targetId)) : tracks;
  const targets = new Set<number>([
    Math.min(duration, Math.max(0, clipStart)),
    Math.min(duration, Math.max(0, clipEnd)),
  ]);

  for (const track of scopedTracks) {
    for (const keyframe of track.keyframes) {
      targets.add(Math.min(duration, Math.max(0, keyframe.time)));
    }
  }

  return Array.from(targets).sort((a, b) => a - b);
}

export function findAdjacentTimelineTarget(
  targets: readonly number[],
  currentTime: number,
  direction: TimelineNavigationDirection,
): number {
  const tolerance = 0.5;
  if (direction === 'previous') {
    for (let index = targets.length - 1; index >= 0; index -= 1) {
      if (targets[index] < currentTime - tolerance) return targets[index];
    }
    return currentTime;
  }

  for (const target of targets) {
    if (target > currentTime + tolerance) return target;
  }
  return currentTime;
}

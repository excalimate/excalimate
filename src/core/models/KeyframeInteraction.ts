import type { AnimationTrack } from '../../types/animation';

export interface KeyframeMove {
  trackId: string;
  keyframeId: string;
  time: number;
}

export interface KeyframeGroupMove {
  delta: number;
  moves: KeyframeMove[];
}

const MIN_KEYFRAME_GAP_MS = 1;

export function resolveKeyframeSelection(
  selectedKeyframeIds: readonly string[],
  keyframeId: string,
  toggle: boolean,
): string[] {
  if (!toggle) return [keyframeId];
  if (selectedKeyframeIds.includes(keyframeId)) {
    return selectedKeyframeIds.filter((id) => id !== keyframeId);
  }
  return [...selectedKeyframeIds, keyframeId];
}

export function getCurrentTimeKeyframeIds(
  tracks: readonly AnimationTrack[],
  selectedElementIds: readonly string[],
  currentTime: number,
): string[] {
  const selectedElements = new Set(selectedElementIds);
  const highlighted: string[] = [];

  for (const track of tracks) {
    if (!selectedElements.has(track.targetId)) continue;
    for (const keyframe of track.keyframes) {
      if (Math.abs(keyframe.time - currentTime) < 1) {
        highlighted.push(keyframe.id);
      }
    }
  }

  return highlighted;
}

export function calculateKeyframeGroupMove(
  tracks: readonly AnimationTrack[],
  selectedKeyframeIds: readonly string[],
  requestedDelta: number,
  duration: number,
): KeyframeGroupMove {
  const selectedIds = new Set(selectedKeyframeIds);
  const selected = tracks.flatMap((track) =>
    track.keyframes
      .filter((keyframe) => selectedIds.has(keyframe.id))
      .map((keyframe) => ({ track, keyframe })),
  );

  if (selected.length === 0 || requestedDelta === 0) {
    return { delta: 0, moves: [] };
  }

  const minDelta = -Math.min(...selected.map(({ keyframe }) => keyframe.time));
  const maxDelta = Math.max(0, duration) - Math.max(...selected.map(({ keyframe }) => keyframe.time));
  let delta = Math.max(minDelta, Math.min(maxDelta, requestedDelta));

  while (delta !== 0) {
    const collisions = selected.flatMap(({ track, keyframe }) =>
      track.keyframes
        .filter(
          (other) =>
            !selectedIds.has(other.id) &&
            Math.abs(keyframe.time + delta - other.time) < MIN_KEYFRAME_GAP_MS,
        )
        .map((other) => other.time - keyframe.time),
    );
    if (collisions.length === 0) break;

    delta =
      delta > 0
        ? Math.max(0, Math.min(...collisions) - MIN_KEYFRAME_GAP_MS)
        : Math.min(0, Math.max(...collisions) + MIN_KEYFRAME_GAP_MS);
  }

  if (delta === 0) return { delta: 0, moves: [] };

  return {
    delta,
    moves: selected.map(({ track, keyframe }) => ({
      trackId: track.id,
      keyframeId: keyframe.id,
      time: keyframe.time + delta,
    })),
  };
}

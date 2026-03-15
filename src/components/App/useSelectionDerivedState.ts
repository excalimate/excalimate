import { useMemo } from 'react';
import type { AnimationTimeline, AnimationTrack, Keyframe } from '../../types/animation';
import type { AnimatableTarget } from '../../types/excalidraw';

export function useSelectionDerivedState(params: {
  targets: AnimatableTarget[];
  timeline: AnimationTimeline;
  selectedElementIds: string[];
  selectedKeyframeIds: string[];
}): {
  targetLabels: Map<string, string>;
  targetOrder: Map<string, number>;
  selectedTargets: AnimatableTarget[];
  selectedTargetTracks: AnimationTrack[];
  selectedKeyframeDetails: { track: AnimationTrack; keyframe: Keyframe }[];
} {
  const {
    targets,
    timeline,
    selectedElementIds,
    selectedKeyframeIds,
  } = params;

  const targetLabels = useMemo(() => {
    const map = new Map<string, string>();
    for (const target of targets) {
      map.set(target.id, target.label);
    }
    return map;
  }, [targets]);

  const targetOrder = useMemo(() => {
    const map = new Map<string, number>();
    targets.forEach((t, i) => map.set(t.id, i));
    return map;
  }, [targets]);

  const selectedTargets = useMemo(() => {
    if (selectedElementIds.length === 0) return [];
    return selectedElementIds
      .map((id) => targets.find((t) => t.id === id))
      .filter((t): t is AnimatableTarget => t !== undefined);
  }, [selectedElementIds, targets]);

  const selectedTargetTracks = useMemo(() => {
    if (selectedTargets.length === 0) return [];
    const selectedIds = new Set(selectedTargets.map((t) => t.id));
    return timeline.tracks.filter((t) => selectedIds.has(t.targetId));
  }, [selectedTargets, timeline.tracks]);

  const selectedKeyframeDetails = useMemo(() => {
    const result: { track: AnimationTrack; keyframe: Keyframe }[] = [];
    const selectedKfSet = new Set(selectedKeyframeIds);
    for (const track of timeline.tracks) {
      for (const kf of track.keyframes) {
        if (selectedKfSet.has(kf.id)) {
          result.push({ track, keyframe: kf });
        }
      }
    }
    return result;
  }, [timeline.tracks, selectedKeyframeIds]);

  return {
    targetLabels,
    targetOrder,
    selectedTargets,
    selectedTargetTracks,
    selectedKeyframeDetails,
  };
}

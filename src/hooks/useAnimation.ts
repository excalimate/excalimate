import { useRef, useMemo, useEffect } from 'react';
import { AnimationEngine } from '../core/engine/AnimationEngine';
import type { GroupHierarchy } from '../core/engine/AnimationEngine';
import { useAnimationStore } from '../stores/animationStore';
import { usePlaybackStore } from '../stores/playbackStore';
import { useProjectStore } from '../stores/projectStore';
import type { FrameState } from '../types/animation';

export function useAnimation(): FrameState {
  const engineRef = useRef(new AnimationEngine());
  const { timeline } = useAnimationStore();
  const { currentTime, setFrameState } = usePlaybackStore();
  const { targets } = useProjectStore();

  // Build group hierarchy from targets
  const groupHierarchy = useMemo<GroupHierarchy>(() => {
    const hierarchy: GroupHierarchy = {};
    for (const target of targets) {
      if (target.type === 'group') {
        hierarchy[target.id] = target.elementIds;
      }
    }
    return hierarchy;
  }, [targets]);

  // Invalidate engine cache when timeline changes
  useEffect(() => {
    engineRef.current.invalidateCache();
  }, [timeline]);

  // Compute frame state
  const frameState = useMemo<FrameState>(() => {
    return engineRef.current.computeFrame(timeline, currentTime, groupHierarchy);
  }, [timeline, currentTime, groupHierarchy]);

  // Sync to playback store
  useEffect(() => {
    setFrameState(frameState);
  }, [frameState, setFrameState]);

  return frameState;
}

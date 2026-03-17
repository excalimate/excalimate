import { useState, useMemo, useEffect } from 'react';
import { AnimationEngine } from '../core/engine/AnimationEngine';
import { buildGroupHierarchy } from '../core/models/GroupHierarchy';
import { useAnimationStore } from '../stores/animationStore';
import { usePlaybackStore } from '../stores/playbackStore';
import { useProjectStore } from '../stores/projectStore';
import type { FrameState } from '../types/animation';

export function useAnimation(): FrameState {
  // Use useState initializer so the engine is created once and is stable across renders
  const [engine] = useState(() => new AnimationEngine());
  const { timeline } = useAnimationStore();
  const { currentTime, setFrameState } = usePlaybackStore();
  const { targets } = useProjectStore();

  // Build group hierarchy from targets
  const groupHierarchy = useMemo(() => buildGroupHierarchy(targets), [targets]);

  // Invalidate engine cache when timeline changes
  useEffect(() => {
    engine.invalidateCache();
  }, [engine, timeline]);

  // Compute frame state using the engine
  const frameState = useMemo<FrameState>(() => {
    return engine.computeFrame(timeline, currentTime, groupHierarchy);
  }, [engine, timeline, currentTime, groupHierarchy]);

  // Sync to playback store
  useEffect(() => {
    setFrameState(frameState);
  }, [frameState, setFrameState]);

  return frameState;
}

/**
 * Singleton PlaybackController accessible app-wide.
 * Created lazily on first access.
 */

import { PlaybackController } from './PlaybackController';
import { usePlaybackStore } from '../../stores/playbackStore';
import { useAnimationStore } from '../../stores/animationStore';
import { useProjectStore } from '../../stores/projectStore';
import { AnimationEngine } from './AnimationEngine';
import type { PlaybackState } from '../../types/ui';
import { buildGroupHierarchy } from '../models/GroupHierarchy';
import type { AnimatableTarget } from '../../types/excalidraw';

let _controller: PlaybackController | null = null;
const _engine = new AnimationEngine();
let _cachedTargets: AnimatableTarget[] | null = null;
let _cachedHierarchy: ReturnType<typeof buildGroupHierarchy> = {};

/** Get or rebuild group hierarchy (cached by targets reference). */
function getHierarchy(): ReturnType<typeof buildGroupHierarchy> {
  const targets = useProjectStore.getState().targets;
  if (targets !== _cachedTargets) {
    _cachedTargets = targets;
    _cachedHierarchy = buildGroupHierarchy(targets);
  }
  return _cachedHierarchy;
}

function recomputeFrameState(time: number): void {
  _engine.invalidateCache();
  const timeline = useAnimationStore.getState().timeline;
  const frameState = _engine.computeFrame(timeline, time, getHierarchy());
  usePlaybackStore.getState().setFrameState(frameState);
}

export function getPlaybackController(): PlaybackController {
  if (!_controller) {
    const duration = useAnimationStore.getState().timeline.duration;
    _controller = new PlaybackController(duration);

    _controller.onFrame((time: number) => {
      usePlaybackStore.getState().setCurrentTime(time);
      const timeline = useAnimationStore.getState().timeline;
      const frameState = _engine.computeFrame(timeline, time, getHierarchy());
      usePlaybackStore.getState().setFrameState(frameState);
    });

    _controller.onStateChange((state: PlaybackState) => {
      usePlaybackStore.getState().setPlaybackState(state);
    });

    // Recompute frame state whenever timeline changes (tracks added/removed/modified, or undo/redo)
    useAnimationStore.subscribe((s, prev) => {
      _controller?.setDuration(s.timeline.duration);
      if (s.timeline !== prev.timeline) {
        recomputeFrameState(usePlaybackStore.getState().currentTime);
      }
    });
  }
  return _controller;
}

export function getAnimationEngine(): AnimationEngine {
  return _engine;
}

/**
 * Compute frame state for a given time without playback.
 * Also syncs the PlaybackController so play() resumes from this time.
 */
export function computeFrameAtTime(time: number): void {
  recomputeFrameState(time);
  usePlaybackStore.getState().setCurrentTime(time);
  if (_controller) {
    _controller.seekSilent(time);
  }
}

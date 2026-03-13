/**
 * Singleton PlaybackController accessible app-wide.
 * Created lazily on first access.
 *
 * Group transforms are NOT composed in the engine. Instead, the
 * AnimationPreview wraps group members in SVG <g> elements and applies
 * per-target CSS transforms. The browser's native CSS cascade handles
 * parent→child composition (translate adds, scale multiplies, etc.).
 */

import { PlaybackController } from './PlaybackController';
import { usePlaybackStore } from '../../stores/playbackStore';
import { useAnimationStore } from '../../stores/animationStore';
import { AnimationEngine } from './AnimationEngine';
import type { PlaybackState } from '../../types/ui';

let _controller: PlaybackController | null = null;
const _engine = new AnimationEngine();

function recomputeFrameState(time: number): void {
  _engine.invalidateCache();
  const timeline = useAnimationStore.getState().timeline;
  const frameState = _engine.computeFrame(timeline, time);
  usePlaybackStore.getState().setFrameState(frameState);
}

export function getPlaybackController(): PlaybackController {
  if (!_controller) {
    const duration = useAnimationStore.getState().timeline.duration;
    _controller = new PlaybackController(duration);

    _controller.onFrame((time: number) => {
      usePlaybackStore.getState().setCurrentTime(time);
      const timeline = useAnimationStore.getState().timeline;
      const frameState = _engine.computeFrame(timeline, time);
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

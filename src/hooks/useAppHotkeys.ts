import { useLayoutEffect } from 'react';
import { useHotkeys } from '@mantine/hooks';
import { useAnimationStore } from '../stores/animationStore';
import { useUndoRedoStore } from '../stores/undoRedoStore';
import { useUIStore } from '../stores/uiStore';
import { usePlaybackStore } from '../stores/playbackStore';
import { useProjectStore } from '../stores/projectStore';
import { getPlaybackController, computeFrameAtTime } from '../core/engine/playbackSingleton';
import { trackGroupAction } from '../services/analytics/posthog';

const FRAME_DURATION = 1000 / 60;

function deleteSelectedKeyframes() {
  const { selectedKeyframeIds, timeline } = useAnimationStore.getState();
  if (selectedKeyframeIds.length === 0) return;

  useUndoRedoStore.getState().pushState();

  const selectedSet = new Set(selectedKeyframeIds);

  // Collect all (trackId, keyframeId) pairs first, then batch-remove.
  // This avoids calling removeKeyframe (which triggers set()) N times.
  const toRemove: [string, string][] = [];
  for (const track of timeline.tracks) {
    for (const kf of track.keyframes) {
      if (selectedSet.has(kf.id)) {
        toRemove.push([track.id, kf.id]);
      }
    }
  }

  const store = useAnimationStore.getState();
  for (const [trackId, kfId] of toRemove) {
    store.removeKeyframe(trackId, kfId);
  }

  useAnimationStore.getState().clearKeyframeSelection();
}

/**
 * Register all application keyboard shortcuts via Mantine useHotkeys.
 * Uses getState() for all actions to avoid subscribing to store state.
 */
export function useAppHotkeys() {
  // In animate mode, intercept Ctrl+Z / Ctrl+Shift+Z in the capture phase
  // BEFORE Excalidraw's own undo handler sees the event. This ensures our
  // timeline undo/redo takes priority over Excalidraw's canvas undo.
  // Use useLayoutEffect to guarantee registration BEFORE Excalidraw's
  // own keydown listener. useEffect would race with child component effects.
  useLayoutEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (useUIStore.getState().mode !== 'animate') return;

      // Ctrl+Z / Ctrl+Shift+Z — undo/redo
      const isMod = e.ctrlKey || e.metaKey;
      if (isMod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        e.stopImmediatePropagation();

        if (e.shiftKey) {
          const result = useUndoRedoStore.getState().redo();
          const time = result?.time ?? usePlaybackStore.getState().currentTime;
          computeFrameAtTime(time);
        } else {
          const result = useUndoRedoStore.getState().undo();
          const time = result?.time ?? usePlaybackStore.getState().currentTime;
          computeFrameAtTime(time);
        }
        return;
      }

      // Escape — clear keyframe selection (Excalidraw handles element
      // deselection internally, but stopPropagation prevents our Mantine
      // handler from firing, so we catch it in capture phase here)
      if (e.key === 'Escape') {
        const { selectedKeyframeIds } = useAnimationStore.getState();
        if (selectedKeyframeIds.length > 0) {
          useAnimationStore.getState().clearKeyframeSelection();
        }
      }
    };
    // Capture phase — fires before Excalidraw's bubble-phase handler
    document.addEventListener('keydown', handler, true);
    return () => document.removeEventListener('keydown', handler, true);
  }, []);

  useHotkeys([
    // Playback
    ['Space', () => getPlaybackController().togglePlayPause()],
    ['Home', () => computeFrameAtTime(0)],
    ['End', () => {
      const dur = useAnimationStore.getState().timeline.duration;
      computeFrameAtTime(dur);
    }],
    ['ArrowLeft', () => {
      const time = usePlaybackStore.getState().currentTime;
      computeFrameAtTime(Math.max(0, time - FRAME_DURATION));
    }],
    ['ArrowRight', () => {
      const time = usePlaybackStore.getState().currentTime;
      const duration = useAnimationStore.getState().timeline.duration;
      computeFrameAtTime(Math.min(duration, time + FRAME_DURATION));
    }],

    // Undo/Redo in animate mode is handled by the capture-phase interceptor above.
    // In edit mode, Excalidraw handles its own undo natively — no handler needed.

    // Delete selected keyframes
    ['Delete', deleteSelectedKeyframes],
    ['Backspace', deleteSelectedKeyframes],

    // Group / Ungroup
    ['mod+G', () => {
      const selectedIds = useUIStore.getState().selectedElementIds;
      if (selectedIds.length >= 2) {
        useProjectStore.getState().groupElements(selectedIds);
        trackGroupAction('group', selectedIds.length);
      }
    }],
    ['mod+shift+G', () => {
      const selectedIds = useUIStore.getState().selectedElementIds;
      if (selectedIds.length === 1) {
        const target = useProjectStore.getState().targets.find(
          (t) => t.id === selectedIds[0] && t.type === 'group',
        );
        if (target) {
          useProjectStore.getState().ungroupTarget(target.id);
          useUIStore.getState().clearSelection();
          trackGroupAction('ungroup');
        }
      }
    }],

    // Mode toggle
    ['mod+E', () => useUIStore.getState().toggleMode()],

    // Close property panel / deselect
    ['Escape', () => {
      const { selectedElementIds } = useUIStore.getState();
      const { selectedKeyframeIds } = useAnimationStore.getState();
      if (selectedElementIds.length > 0 || selectedKeyframeIds.length > 0) {
        useUIStore.getState().setSelectedElements([]);
        useAnimationStore.getState().clearKeyframeSelection();
      }
    }],
  ]);
}

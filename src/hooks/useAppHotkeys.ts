import { useHotkeys } from '@mantine/hooks';
import { useAnimationStore } from '../stores/animationStore';
import { useUndoRedoStore } from '../stores/undoRedoStore';
import { useUIStore } from '../stores/uiStore';
import { usePlaybackStore } from '../stores/playbackStore';
import { useProjectStore } from '../stores/projectStore';
import { getPlaybackController, computeFrameAtTime } from '../core/engine/playbackSingleton';

const FRAME_DURATION = 1000 / 60;

function deleteSelectedKeyframes() {
  const { selectedTrackId, selectedKeyframeIds, removeKeyframe } = useAnimationStore.getState();
  if (selectedTrackId && selectedKeyframeIds.length > 0) {
    for (const kfId of selectedKeyframeIds) removeKeyframe(selectedTrackId, kfId);
  }
}

/**
 * Register all application keyboard shortcuts via Mantine useHotkeys.
 * Uses getState() for all actions to avoid subscribing to store state.
 */
export function useAppHotkeys() {
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

    // Undo/Redo
    ['mod+Z', () => {
      const result = useUndoRedoStore.getState().undo();
      const time = result?.time ?? usePlaybackStore.getState().currentTime;
      computeFrameAtTime(time);
    }],
    ['mod+shift+Z', () => {
      const result = useUndoRedoStore.getState().redo();
      const time = result?.time ?? usePlaybackStore.getState().currentTime;
      computeFrameAtTime(time);
    }],

    // Delete selected keyframes
    ['Delete', deleteSelectedKeyframes],
    ['Backspace', deleteSelectedKeyframes],

    // Group / Ungroup
    ['mod+G', () => {
      const selectedIds = useUIStore.getState().selectedElementIds;
      if (selectedIds.length >= 2) {
        useProjectStore.getState().groupElements(selectedIds);
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

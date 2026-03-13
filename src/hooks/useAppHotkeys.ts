import { useHotkeys } from './useHotkeys';
import { useAnimationStore } from '../stores/animationStore';
import { useUndoRedoStore } from '../stores/undoRedoStore';
import { useUIStore } from '../stores/uiStore';
import { usePlaybackStore } from '../stores/playbackStore';
import { useProjectStore } from '../stores/projectStore';
import { getPlaybackController, computeFrameAtTime } from '../core/engine/playbackSingleton';

const FRAME_DURATION = 1000 / 60;

/**
 * Register all application keyboard shortcuts.
 * Uses getState() for all actions to avoid subscribing to store state.
 */
export function useAppHotkeys() {
  useHotkeys([
    // Playback
    { key: ' ', handler: () => getPlaybackController().togglePlayPause(), preventDefault: true },
    { key: 'Home', handler: () => {
      computeFrameAtTime(0);
    }},
    { key: 'End', handler: () => {
      const dur = useAnimationStore.getState().timeline.duration;
      computeFrameAtTime(dur);
    }},
    {
      key: 'ArrowLeft',
      handler: () => {
        const time = usePlaybackStore.getState().currentTime;
        const newTime = Math.max(0, time - FRAME_DURATION);
        computeFrameAtTime(newTime);
      },
    },
    {
      key: 'ArrowRight',
      handler: () => {
        const time = usePlaybackStore.getState().currentTime;
        const duration = useAnimationStore.getState().timeline.duration;
        const newTime = Math.min(duration, time + FRAME_DURATION);
        computeFrameAtTime(newTime);
      },
    },

    // Undo/Redo — restore timeline and jump to the time of the undone change
    { key: 'z', ctrl: true, handler: () => {
      const result = useUndoRedoStore.getState().undo();
      const time = result?.time ?? usePlaybackStore.getState().currentTime;
      computeFrameAtTime(time);
    }, preventDefault: true },
    { key: 'z', ctrl: true, shift: true, handler: () => {
      const result = useUndoRedoStore.getState().redo();
      const time = result?.time ?? usePlaybackStore.getState().currentTime;
      computeFrameAtTime(time);
    }, preventDefault: true },

    // Delete selected keyframes
    {
      key: 'Delete',
      handler: () => {
        const { selectedTrackId, selectedKeyframeIds, removeKeyframe } = useAnimationStore.getState();
        if (selectedTrackId && selectedKeyframeIds.length > 0) {
          for (const kfId of selectedKeyframeIds) removeKeyframe(selectedTrackId, kfId);
        }
      },
    },
    {
      key: 'Backspace',
      handler: () => {
        const { selectedTrackId, selectedKeyframeIds, removeKeyframe } = useAnimationStore.getState();
        if (selectedTrackId && selectedKeyframeIds.length > 0) {
          for (const kfId of selectedKeyframeIds) removeKeyframe(selectedTrackId, kfId);
        }
      },
    },

    // Group selected elements (Ctrl+G)
    {
      key: 'g',
      ctrl: true,
      handler: () => {
        const selectedIds = useUIStore.getState().selectedElementIds;
        if (selectedIds.length >= 2) {
          useProjectStore.getState().groupElements(selectedIds);
        }
      },
      preventDefault: true,
    },

    // Ungroup selected group (Ctrl+Shift+G)
    {
      key: 'g',
      ctrl: true,
      shift: true,
      handler: () => {
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
      },
      preventDefault: true,
    },

    // Mode toggle
    { key: 'e', ctrl: true, handler: () => useUIStore.getState().toggleMode(), preventDefault: true },
  ]);
}

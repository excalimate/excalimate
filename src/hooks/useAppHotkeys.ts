import { useLayoutEffect } from 'react';
import { useHotkeys } from '@mantine/hooks';
import { useAnimationStore } from '../stores/animationStore';
import { useUndoRedoStore } from '../stores/undoRedoStore';
import { useUIStore } from '../stores/uiStore';
import { usePlaybackStore } from '../stores/playbackStore';
import { useProjectStore } from '../stores/projectStore';
import { getPlaybackController, computeFrameAtTime } from '../core/engine/playbackSingleton';
import { trackGroupAction } from '../services/analytics/posthog';
import { trackCreatorEvent } from '../services/analytics/posthog';
import { requestFocusedSequenceMove } from '../components/Sequence/sequenceHotkeys';
import { MAX_ZOOM, MIN_ZOOM } from '../components/Timeline/timelineModel';
import {
  clampTimelineZoom,
  getPlayheadZoomAnchorX,
  getTimelineViewportAtTime,
} from '../components/Timeline/timelineMath';
import {
  findAdjacentTimelineTarget,
  getFrameShortcutNavigation,
  getRelevantTimelineTargets,
  type TimelineFrameShortcut,
  type TimelineNavigationDirection,
} from '../components/Timeline/timelineNavigation';
import { stepTimeByFrames } from '../components/Timeline/timelineTime';

const TIMELINE_ZOOM_FACTOR = 1.25;

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

function seekByFrames(direction: TimelineNavigationDirection, frameCount: number) {
  const { timeline } = useAnimationStore.getState();
  const currentTime = usePlaybackStore.getState().currentTime;
  computeFrameAtTime(
    stepTimeByFrames(
      currentTime,
      direction === 'previous' ? -frameCount : frameCount,
      timeline.fps,
      timeline.duration,
    ),
  );
}

function seekByFrameShortcut(shortcut: TimelineFrameShortcut) {
  const navigation = getFrameShortcutNavigation(shortcut);
  seekByFrames(navigation.direction, navigation.frameCount);
}

function seekToTimelineTarget(direction: TimelineNavigationDirection) {
  const { timeline, clipStart, clipEnd } = useAnimationStore.getState();
  const currentTime = usePlaybackStore.getState().currentTime;
  const targets = getRelevantTimelineTargets({
    tracks: timeline.tracks,
    selectedTargetIds: useUIStore.getState().selectedElementIds,
    clipStart,
    clipEnd,
    duration: timeline.duration,
  });
  computeFrameAtTime(findAdjacentTimelineTarget(targets, currentTime, direction));
}

function zoomTimeline(direction: 'in' | 'out') {
  const ui = useUIStore.getState();
  const { zoom, scrollX, width } = ui.timelineViewport;
  const nextZoom = clampTimelineZoom(
    zoom * (direction === 'in' ? TIMELINE_ZOOM_FACTOR : 1 / TIMELINE_ZOOM_FACTOR),
    MIN_ZOOM,
    MAX_ZOOM,
  );
  if (nextZoom === zoom) return;
  if (width <= 0) {
    ui.setTimelineZoom(nextZoom);
    return;
  }

  const currentTime = usePlaybackStore.getState().currentTime;
  const duration = useAnimationStore.getState().timeline.duration;
  const anchorX = getPlayheadZoomAnchorX(currentTime, zoom, scrollX, width);
  const viewport = getTimelineViewportAtTime({
    duration,
    newZoom: nextZoom,
    viewportWidth: width,
    anchorTime: currentTime,
    anchorX,
  });
  ui.setTimelineViewport(viewport.zoom, viewport.scrollX);
}

function isEditableHotkeyTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) ||
    target.isContentEditable ||
    target.closest('[contenteditable="true"]') !== null
  );
}

function handleTimelineCaptureHotkey(event: KeyboardEvent): boolean {
  if (isEditableHotkeyTarget(event.target) || event.ctrlKey || event.metaKey || event.altKey) {
    return false;
  }

  if (event.key === 'PageUp' || event.key === 'PageDown') {
    const shortcut: TimelineFrameShortcut = event.shiftKey ? `shift+${event.key}` : event.key;
    seekByFrameShortcut(shortcut);
    return true;
  }
  if (event.shiftKey) return false;

  if (event.key.toLowerCase() === 'j') {
    seekToTimelineTarget('previous');
    return true;
  }
  if (event.key.toLowerCase() === 'k') {
    seekToTimelineTarget('next');
    return true;
  }
  if (event.code === 'Equal') {
    zoomTimeline('in');
    return true;
  }
  if (event.code === 'Minus') {
    zoomTimeline('out');
    return true;
  }
  return false;
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

      if (handleTimelineCaptureHotkey(e)) {
        e.preventDefault();
        e.stopImmediatePropagation();
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

  useHotkeys(
    [
      // Playback
      [
        'Space',
        () => {
          const { workspace, canvasMode } = useUIStore.getState();
          if (workspace === 'magic' && canvasMode === 'design') return;
          getPlaybackController().togglePlayPause();
        },
      ],
      ['Home', () => computeFrameAtTime(0)],
      [
        'End',
        () => {
          const dur = useAnimationStore.getState().timeline.duration;
          computeFrameAtTime(dur);
        },
      ],
      [
        'ArrowLeft',
        () => {
          const time = usePlaybackStore.getState().currentTime;
          const { fps, duration } = useAnimationStore.getState().timeline;
          computeFrameAtTime(stepTimeByFrames(time, -1, fps, duration));
        },
      ],
      [
        'ArrowRight',
        () => {
          const time = usePlaybackStore.getState().currentTime;
          const { fps, duration } = useAnimationStore.getState().timeline;
          computeFrameAtTime(stepTimeByFrames(time, 1, fps, duration));
        },
      ],
      ['shift+PageUp', () => seekByFrameShortcut('shift+PageUp'), { preventDefault: true }],
      ['shift+PageDown', () => seekByFrameShortcut('shift+PageDown'), { preventDefault: true }],
      ['PageUp', () => seekByFrameShortcut('PageUp'), { preventDefault: true }],
      ['PageDown', () => seekByFrameShortcut('PageDown'), { preventDefault: true }],
      ['Equal', () => zoomTimeline('in'), { preventDefault: true, usePhysicalKeys: true }],
      ['Minus', () => zoomTimeline('out'), { preventDefault: true, usePhysicalKeys: true }],
      ['J', () => seekToTimelineTarget('previous'), { preventDefault: true }],
      ['K', () => seekToTimelineTarget('next'), { preventDefault: true }],

      // Undo/Redo in animate mode is handled by the capture-phase interceptor above.
      // In edit mode, Excalidraw handles its own undo natively — no handler needed.

      // Delete selected keyframes
      ['Delete', deleteSelectedKeyframes],
      ['Backspace', deleteSelectedKeyframes],

      // Group / Ungroup
      [
        'mod+G',
        () => {
          const selectedIds = useUIStore.getState().selectedElementIds;
          if (selectedIds.length >= 2) {
            useProjectStore.getState().groupElements(selectedIds);
            trackGroupAction('group', selectedIds.length);
          }
        },
      ],
      [
        'mod+shift+G',
        () => {
          const selectedIds = useUIStore.getState().selectedElementIds;
          if (selectedIds.length === 1) {
            const target = useProjectStore
              .getState()
              .targets.find((t) => t.id === selectedIds[0] && t.type === 'group');
            if (target) {
              useProjectStore.getState().ungroupTarget(target.id);
              useUIStore.getState().clearSelection();
              trackGroupAction('ungroup');
            }
          }
        },
      ],

      // Mode toggle remains compatible with Studio and maps to canvas mode in Magic.
      [
        'mod+E',
        () => {
          const state = useUIStore.getState();
          if (state.workspace === 'magic') {
            state.setCanvasMode(state.canvasMode === 'design' ? 'preview' : 'design');
          } else {
            state.toggleMode();
          }
        },
      ],

      // Progressive workspace navigation.
      ['mod+1', () => switchWorkspace('magic')],
      ['mod+2', () => switchWorkspace('sequence')],
      ['mod+3', () => switchWorkspace('studio')],
      ['alt+ArrowUp', () => requestFocusedSequenceMove('up')],
      ['alt+ArrowDown', () => requestFocusedSequenceMove('down')],
      ['alt+Home', () => requestFocusedSequenceMove('top')],
      ['alt+End', () => requestFocusedSequenceMove('bottom')],

      // Close property panel / deselect
      [
        'Escape',
        () => {
          const { selectedElementIds } = useUIStore.getState();
          const { selectedKeyframeIds } = useAnimationStore.getState();
          if (selectedElementIds.length > 0 || selectedKeyframeIds.length > 0) {
            useUIStore.getState().setSelectedElements([]);
            useAnimationStore.getState().clearKeyframeSelection();
          }
        },
      ],
    ],
    ['INPUT', 'TEXTAREA', 'SELECT'],
    false,
  );
}

function switchWorkspace(workspace: 'magic' | 'sequence' | 'studio') {
  useUIStore.getState().setWorkspace(workspace);
  trackCreatorEvent('creator_workspace_changed', {
    workspace,
    source: 'switcher',
  });
}

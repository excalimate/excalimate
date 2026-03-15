import { create } from 'zustand';
import type { AnimationTimeline } from '../types/animation';
import { useAnimationStore } from './animationStore';
import { usePlaybackStore } from './playbackStore';

const MAX_HISTORY = 50;

interface UndoRedoState {
  past: { timeline: AnimationTimeline; time: number }[];
  future: { timeline: AnimationTimeline; time: number }[];
  canUndo: boolean;
  canRedo: boolean;

  /**
   * Push the current timeline state onto the undo stack.
   * Always creates a new undo entry unless inside a batch (see beginBatch).
   */
  pushState: () => void;

  /**
   * Begin a batched operation (e.g. drag). While batched, only the first
   * pushState call creates an undo entry — subsequent calls are suppressed
   * until endBatch() is called. This replaces the old 300ms time heuristic
   * with explicit, deterministic boundaries.
   */
  beginBatch: () => void;

  /** End a batched operation. The next pushState will create a new entry. */
  endBatch: () => void;

  undo: () => { time: number } | null;
  redo: () => { time: number } | null;
  clearHistory: () => void;
}

// Batch state lives outside Zustand since it's synchronous control flow,
// not reactive state that should trigger re-renders.
let _batchDepth = 0;
let _batchHasPushed = false;

export const useUndoRedoStore = create<UndoRedoState>()((set, get) => ({
  past: [],
  future: [],
  canUndo: false,
  canRedo: false,

  pushState: () => {
    // Inside a batch: only the first push creates an undo entry
    if (_batchDepth > 0) {
      if (_batchHasPushed) return;
      _batchHasPushed = true;
    }

    const currentTimeline = structuredClone(useAnimationStore.getState().timeline);
    const currentTime = usePlaybackStore.getState().currentTime;
    set((state) => {
      const newPast = [...state.past, { timeline: currentTimeline, time: currentTime }];
      if (newPast.length > MAX_HISTORY) newPast.shift();
      return {
        past: newPast,
        future: [],
        canUndo: true,
        canRedo: false,
      };
    });
  },

  beginBatch: () => {
    _batchDepth++;
    if (_batchDepth === 1) {
      _batchHasPushed = false;
    }
  },

  endBatch: () => {
    if (_batchDepth > 0) _batchDepth--;
  },

  undo: () => {
    const { past } = get();
    if (past.length === 0) return null;

    const currentTimeline = structuredClone(useAnimationStore.getState().timeline);
    const currentTime = usePlaybackStore.getState().currentTime;
    const prev = past[past.length - 1];
    const newPast = past.slice(0, -1);

    useAnimationStore.getState().setTimeline(prev.timeline);

    set({
      past: newPast,
      future: [{ timeline: currentTimeline, time: currentTime }, ...get().future],
      canUndo: newPast.length > 0,
      canRedo: true,
    });

    return { time: prev.time };
  },

  redo: () => {
    const { future } = get();
    if (future.length === 0) return null;

    const currentTimeline = structuredClone(useAnimationStore.getState().timeline);
    const currentTime = usePlaybackStore.getState().currentTime;
    const next = future[0];
    const newFuture = future.slice(1);

    useAnimationStore.getState().setTimeline(next.timeline);

    set({
      past: [...get().past, { timeline: currentTimeline, time: currentTime }],
      future: newFuture,
      canUndo: true,
      canRedo: newFuture.length > 0,
    });

    return { time: next.time };
  },

  clearHistory: () => {
    set({ past: [], future: [], canUndo: false, canRedo: false });
  },
}));

import { create } from 'zustand';
import type { AnimationTimeline } from '../types/animation';
import { useAnimationStore } from './animationStore';

const MAX_HISTORY = 50;

interface UndoRedoState {
  past: { timeline: AnimationTimeline; time: number }[];
  future: { timeline: AnimationTimeline; time: number }[];
  canUndo: boolean;
  canRedo: boolean;
  /** Timestamp of last pushState call — used to batch rapid changes */
  _lastPushTime: number;

  pushState: () => void;
  undo: () => { time: number } | null;
  redo: () => { time: number } | null;
  clearHistory: () => void;
}

export const useUndoRedoStore = create<UndoRedoState>()((set, get) => ({
  past: [],
  future: [],
  canUndo: false,
  canRedo: false,
  _lastPushTime: 0,

  pushState: () => {
    const now = Date.now();
    const { _lastPushTime } = get();
    // Batch rapid changes (within 300ms) into one undo step
    if (now - _lastPushTime < 300) {
      set({ _lastPushTime: now });
      return;
    }

    // Deep clone the timeline so undo restores a distinct object reference
    const currentTimeline = JSON.parse(JSON.stringify(useAnimationStore.getState().timeline));
    const currentTime = (globalThis as any).__playbackCurrentTime ?? 0;
    set((state) => {
      const newPast = [...state.past, { timeline: currentTimeline, time: currentTime }];
      if (newPast.length > MAX_HISTORY) newPast.shift();
      return {
        past: newPast,
        future: [],
        canUndo: true,
        canRedo: false,
        _lastPushTime: now,
      };
    });
  },

  undo: () => {
    const { past } = get();
    if (past.length === 0) return null;

    const currentTimeline = JSON.parse(JSON.stringify(useAnimationStore.getState().timeline));
    const currentTime = (globalThis as any).__playbackCurrentTime ?? 0;
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

    const currentTimeline = JSON.parse(JSON.stringify(useAnimationStore.getState().timeline));
    const currentTime = (globalThis as any).__playbackCurrentTime ?? 0;
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

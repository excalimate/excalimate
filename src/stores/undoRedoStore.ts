import { create } from 'zustand';
import type { AnimationTimeline } from '../types/animation';
import type { ExcalidrawSceneData, AnimatableTarget } from '../types/excalidraw';
import { useAnimationStore } from './animationStore';
import { usePlaybackStore } from './playbackStore';
import { useProjectStore } from './projectStore';

const MAX_HISTORY = 50;

interface Snapshot {
  timeline: AnimationTimeline;
  time: number;
  scene?: ExcalidrawSceneData;
  targets?: AnimatableTarget[];
}

interface UndoRedoState {
  past: Snapshot[];
  future: Snapshot[];
  canUndo: boolean;
  canRedo: boolean;

  /**
   * Push the current timeline state onto the undo stack.
   * Always creates a new undo entry unless inside a batch (see beginBatch).
   */
  pushState: (includeScene?: boolean) => void;

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

  /**
   * Push the current state onto the undo stack.
   * @param includeScene If true, also snapshot scene + targets (needed for element deletion undo).
   *                     Defaults to false to avoid expensive cloning during rapid keyframe edits.
   */
  pushState: (includeScene = false) => {
    if (_batchDepth > 0) {
      if (_batchHasPushed) return;
      _batchHasPushed = true;
    }

    const currentTimeline = structuredClone(useAnimationStore.getState().timeline);
    const currentTime = usePlaybackStore.getState().currentTime;

    // Only clone scene/targets when explicitly requested (e.g., before element deletion)
    let currentScene: ExcalidrawSceneData | undefined;
    let currentTargets: AnimatableTarget[] | undefined;
    if (includeScene) {
      const projectState = useProjectStore.getState();
      if (projectState.project?.scene) {
        currentScene = structuredClone(projectState.project.scene) as ExcalidrawSceneData;
      }
      currentTargets = structuredClone(projectState.targets) as AnimatableTarget[];
    }

    set((state) => {
      const newPast = [...state.past, {
        timeline: currentTimeline,
        time: currentTime,
        scene: currentScene,
        targets: currentTargets,
      }];
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

    const prev = past[past.length - 1];
    const newPast = past.slice(0, -1);

    const currentTimeline = structuredClone(useAnimationStore.getState().timeline);
    const currentTime = usePlaybackStore.getState().currentTime;

    // Only snapshot scene/targets if the entry we're restoring has them
    let currentScene: ExcalidrawSceneData | undefined;
    let currentTargets: AnimatableTarget[] | undefined;
    if (prev.scene || prev.targets) {
      const ps = useProjectStore.getState();
      if (ps.project?.scene) currentScene = structuredClone(ps.project.scene) as ExcalidrawSceneData;
      currentTargets = structuredClone(ps.targets) as AnimatableTarget[];
    }

    useAnimationStore.getState().setTimeline(prev.timeline);
    if (prev.scene) useProjectStore.getState().updateScene(prev.scene);
    if (prev.targets) useProjectStore.getState().setTargets(prev.targets);

    set({
      past: newPast,
      future: [{
        timeline: currentTimeline,
        time: currentTime,
        scene: currentScene,
        targets: currentTargets,
      }, ...get().future],
      canUndo: newPast.length > 0,
      canRedo: true,
    });

    return { time: prev.time };
  },

  redo: () => {
    const { future } = get();
    if (future.length === 0) return null;

    const next = future[0];
    const newFuture = future.slice(1);

    const currentTimeline = structuredClone(useAnimationStore.getState().timeline);
    const currentTime = usePlaybackStore.getState().currentTime;

    let currentScene: ExcalidrawSceneData | undefined;
    let currentTargets: AnimatableTarget[] | undefined;
    if (next.scene || next.targets) {
      const ps = useProjectStore.getState();
      if (ps.project?.scene) currentScene = structuredClone(ps.project.scene) as ExcalidrawSceneData;
      currentTargets = structuredClone(ps.targets) as AnimatableTarget[];
    }

    useAnimationStore.getState().setTimeline(next.timeline);
    if (next.scene) useProjectStore.getState().updateScene(next.scene);
    if (next.targets) useProjectStore.getState().setTargets(next.targets);

    set({
      past: [...get().past, {
        timeline: currentTimeline,
        time: currentTime,
        scene: currentScene,
        targets: currentTargets,
      }],
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

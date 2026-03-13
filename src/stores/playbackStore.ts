import { create } from 'zustand';
import type {
  PlaybackState as PlaybackStatus,
  PlaybackSpeed,
  LoopMode,
} from '../types/ui';
import type { FrameState } from '../types/animation';

interface PlaybackStoreState {
  // State
  currentTime: number;
  state: PlaybackStatus;
  speed: PlaybackSpeed;
  loopMode: LoopMode;
  frameState: FrameState;

  // Actions
  setCurrentTime: (time: number) => void;
  setPlaybackState: (state: PlaybackStatus) => void;
  setSpeed: (speed: PlaybackSpeed) => void;
  setLoopMode: (mode: LoopMode) => void;
  setFrameState: (frameState: FrameState) => void;
}

export const usePlaybackStore = create<PlaybackStoreState>()((set) => ({
  currentTime: 0,
  state: 'stopped',
  speed: 1,
  loopMode: 'none',
  frameState: new Map(),

  setCurrentTime: (time: number): void => {
    (globalThis as any).__playbackCurrentTime = time;
    set({ currentTime: time });
  },

  setPlaybackState: (state: PlaybackStatus): void => {
    set({ state });
  },

  setSpeed: (speed: PlaybackSpeed): void => {
    set({ speed });
  },

  setLoopMode: (mode: LoopMode): void => {
    set({ loopMode: mode });
  },

  setFrameState: (frameState: FrameState): void => {
    set({ frameState });
  },
}));

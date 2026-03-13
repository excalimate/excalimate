import { create } from 'zustand';
import type {
  AppMode,
  PanelSizes,
  TimelineViewport,
} from '../types/ui';

interface UIState {
  // State
  mode: AppMode;
  selectedElementIds: string[];
  panelSizes: PanelSizes;
  timelineViewport: TimelineViewport;
  ghostMode: boolean;
  sequenceRevealOpen: boolean;

  // Actions
  setMode: (mode: AppMode) => void;
  toggleMode: () => void;
  setSelectedElements: (ids: string[]) => void;
  clearSelection: () => void;
  setPanelSize: (panel: keyof PanelSizes, size: number) => void;
  setTimelineZoom: (zoom: number) => void;
  setTimelineScroll: (scrollX: number, scrollY: number) => void;
  toggleSnap: () => void;
  setSnapInterval: (interval: number) => void;
  toggleGhostMode: () => void;
  toggleSequenceReveal: () => void;
}

export const useUIStore = create<UIState>()((set) => ({
  mode: 'edit',
  selectedElementIds: [],
  ghostMode: false,
  sequenceRevealOpen: false,
  panelSizes: {
    leftPanel: 48,
    rightPanel: 280,
    bottomPanel: 250,
  },
  timelineViewport: {
    scrollX: 0,
    scrollY: 0,
    zoom: 0.1,
    snapEnabled: true,
    snapInterval: 100,
  },

  setMode: (mode: AppMode): void => {
    set({ mode });
  },

  toggleMode: (): void => {
    set((state) => ({
      mode: state.mode === 'edit' ? 'animate' : 'edit',
    }));
  },

  setSelectedElements: (ids: string[]): void => {
    set({ selectedElementIds: ids });
  },

  clearSelection: (): void => {
    set({ selectedElementIds: [] });
  },

  setPanelSize: (panel: keyof PanelSizes, size: number): void => {
    set((state) => ({
      panelSizes: { ...state.panelSizes, [panel]: size },
    }));
  },

  setTimelineZoom: (zoom: number): void => {
    set((state) => ({
      timelineViewport: { ...state.timelineViewport, zoom },
    }));
  },

  setTimelineScroll: (scrollX: number, scrollY: number): void => {
    set((state) => ({
      timelineViewport: { ...state.timelineViewport, scrollX, scrollY },
    }));
  },

  toggleSnap: (): void => {
    set((state) => ({
      timelineViewport: {
        ...state.timelineViewport,
        snapEnabled: !state.timelineViewport.snapEnabled,
      },
    }));
  },

  setSnapInterval: (interval: number): void => {
    set((state) => ({
      timelineViewport: { ...state.timelineViewport, snapInterval: interval },
    }));
  },

  toggleGhostMode: (): void => {
    set((state) => ({ ghostMode: !state.ghostMode }));
  },
  toggleSequenceReveal: (): void => {
    set((state) => ({ sequenceRevealOpen: !state.sequenceRevealOpen }));
  },
}));

import { create } from 'zustand';
import type {
  AppMode,
  PanelSizes,
  TimelineViewport,
} from '../types/ui';

export type Theme = 'light' | 'dark';

function getInitialTheme(): Theme {
  const stored = localStorage.getItem('excalimate-theme');
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

interface UIState {
  // State
  mode: AppMode;
  theme: Theme;
  selectedElementIds: string[];
  panelSizes: PanelSizes;
  timelineViewport: TimelineViewport;
  ghostMode: boolean;
  sequenceRevealOpen: boolean;
  layersPanelOpen: boolean;
  liveMode: boolean;

  // Actions
  setMode: (mode: AppMode) => void;
  toggleMode: () => void;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  setSelectedElements: (ids: string[]) => void;
  clearSelection: () => void;
  setPanelSize: (panel: keyof PanelSizes, size: number) => void;
  setTimelineZoom: (zoom: number) => void;
  setTimelineScroll: (scrollX: number, scrollY: number) => void;
  toggleSnap: () => void;
  setSnapInterval: (interval: number) => void;
  toggleGhostMode: () => void;
  toggleSequenceReveal: () => void;
  toggleLayersPanel: () => void;
  setLiveMode: (live: boolean) => void;
}

export const useUIStore = create<UIState>()((set) => ({
  mode: 'edit',
  theme: getInitialTheme(),
  selectedElementIds: [],
  ghostMode: false,
  sequenceRevealOpen: false,
  layersPanelOpen: true,
  liveMode: false,
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

  setTheme: (theme: Theme): void => {
    localStorage.setItem('excalimate-theme', theme);
    set({ theme });
  },

  toggleTheme: (): void => {
    set((state) => {
      const next = state.theme === 'dark' ? 'light' : 'dark';
      localStorage.setItem('excalimate-theme', next);
      return { theme: next };
    });
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
  toggleLayersPanel: (): void => {
    set((state) => ({ layersPanelOpen: !state.layersPanelOpen }));
  },
  setLiveMode: (live: boolean): void => {
    set({ liveMode: live });
  },
}));

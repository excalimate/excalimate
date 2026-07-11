import { create } from 'zustand';
import type {
  AppMode,
  CanvasMode,
  PanelSizes,
  TimelineViewport,
  WorkspaceMode,
} from '../types/ui';
import { computeFrameAtTime } from '../core/engine/playbackSingleton';
import { usePlaybackStore } from './playbackStore';
import { useProjectStore } from './projectStore';

export type Theme = 'light' | 'dark';

function getInitialTheme(): Theme {
  const stored = localStorage.getItem('excalimate-theme');
  if (stored === 'light' || stored === 'dark') return stored;
  return 'light';
}

interface UIState {
  // State
  mode: AppMode;
  workspace: WorkspaceMode;
  canvasMode: CanvasMode;
  theme: Theme;
  selectedElementIds: string[];
  panelSizes: PanelSizes;
  timelineViewport: TimelineViewport;
  ghostMode: boolean;
  layersPanelOpen: boolean;
  timelinePanelOpen: boolean;
  liveMode: boolean;
  /** True when a shape/draw tool is active in Excalidraw (not selection/hand). */
  drawToolActive: boolean;
  startSurfaceDismissed: boolean;
  /** The currently displayed page. null = main app. */
  activePage: string | null;

  // Actions
  setMode: (mode: AppMode) => void;
  toggleMode: () => void;
  setWorkspace: (workspace: WorkspaceMode) => void;
  hydrateWorkspace: (workspace: WorkspaceMode) => void;
  setCanvasMode: (mode: CanvasMode) => void;
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
  toggleLayersPanel: () => void;
  toggleTimelinePanel: () => void;
  setLiveMode: (live: boolean) => void;
  setDrawToolActive: (active: boolean) => void;
  setStartSurfaceDismissed: (dismissed: boolean) => void;
  setActivePage: (page: string | null) => void;
}

export const useUIStore = create<UIState>()((set, get) => ({
  mode: 'edit',
  workspace: 'magic',
  canvasMode: 'design',
  theme: getInitialTheme(),
  selectedElementIds: [],
  ghostMode: false,
  layersPanelOpen: true,
  timelinePanelOpen: true,
  liveMode: false,
  drawToolActive: false,
  startSurfaceDismissed: false,
  activePage: null,
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
    set((state) => ({
      mode,
      ...(state.workspace === 'magic'
        ? { canvasMode: mode === 'edit' ? 'design' : 'preview' }
        : {}),
    }));
    // Ensure the animation frame is computed when entering animate mode,
    // so the canvas immediately shows the correct animated state.
    if (mode === 'animate') {
      computeFrameAtTime(usePlaybackStore.getState().currentTime);
    }
  },

  toggleMode: (): void => {
    const next = get().mode === 'edit' ? 'animate' : 'edit';
    get().setMode(next);
  },

  setWorkspace: (workspace: WorkspaceMode): void => {
    const canvasMode = get().canvasMode;
    set({
      workspace,
      mode:
        workspace === 'magic'
          ? canvasMode === 'design'
            ? 'edit'
            : 'animate'
          : 'animate',
    });
    useProjectStore.getState().setPreferredWorkspace(workspace);
    if (workspace !== 'magic' || canvasMode === 'preview') {
      computeFrameAtTime(usePlaybackStore.getState().currentTime);
    }
  },

  hydrateWorkspace: (workspace: WorkspaceMode): void => {
    const canvasMode: CanvasMode = 'design';
    set({
      workspace,
      canvasMode,
      mode: workspace === 'magic' ? 'edit' : 'animate',
      startSurfaceDismissed: false,
    });
    if (workspace !== 'magic') {
      computeFrameAtTime(usePlaybackStore.getState().currentTime);
    }
  },

  setCanvasMode: (canvasMode: CanvasMode): void => {
    set((state) => ({
      canvasMode,
      ...(state.workspace === 'magic'
        ? { mode: canvasMode === 'design' ? 'edit' : 'animate' }
        : {}),
    }));
    if (canvasMode === 'preview') {
      computeFrameAtTime(usePlaybackStore.getState().currentTime);
    }
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
  toggleLayersPanel: (): void => {
    set((state) => ({ layersPanelOpen: !state.layersPanelOpen }));
  },
  toggleTimelinePanel: (): void => {
    set((state) => ({ timelinePanelOpen: !state.timelinePanelOpen }));
  },
  setLiveMode: (live: boolean): void => {
    set({ liveMode: live });
  },

  setDrawToolActive: (active: boolean): void => {
    set({ drawToolActive: active });
  },

  setStartSurfaceDismissed: (dismissed: boolean): void => {
    set({ startSurfaceDismissed: dismissed });
  },

  setActivePage: (page: string | null): void => {
    set({ activePage: page });
  },
}));

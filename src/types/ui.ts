export type AppMode = 'edit' | 'animate';
export type PlaybackState = 'playing' | 'paused' | 'stopped';
export type LoopMode = 'none' | 'loop' | 'pingpong';
export type PlaybackSpeed = 0.25 | 0.5 | 1 | 2;

export interface PanelSizes {
  leftPanel: number;
  rightPanel: number;
  bottomPanel: number;
}

export interface TimelineViewport {
  scrollX: number;
  scrollY: number;
  zoom: number; // pixels per millisecond
  snapEnabled: boolean;
  snapInterval: number; // ms
}

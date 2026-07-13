import type { AnimationTimeline, AspectRatio, CameraFrame } from '@excalimate/project-schema';
import type { FrameState, GroupHierarchy } from '@excalimate/animation-core';

export const PLAYER_PACKAGE_VERSION = '1.0.0' as const;
export const PLAYER_RUNTIME_VERSION = '1.0.0' as const;

export const PLAYER_PACKAGE_LIMITS = Object.freeze({
  maxEncodedBytes: 20 * 1024 * 1024,
  maxSvgBytes: 12 * 1024 * 1024,
  maxAbsoluteOpacityTargets: 10_000,
  maxTitleLength: 128,
  maxHierarchyGroups: 10_000,
  maxHierarchyMembers: 100_000,
  minRate: 0.25,
  maxRate: 4,
});

export interface PlayerDimensions {
  width: number;
  height: number;
  aspectRatio: AspectRatio;
}

export interface PlayerCamera extends CameraFrame {
  height: number;
  sceneOffsetX: number;
  sceneOffsetY: number;
}

export interface PlayerPosterMetadata {
  kind: 'frame';
  timeMs: number;
}

export interface PlayerAttribution {
  label: 'Made with Excalimate';
  url: 'https://excalimate.com';
}

export interface PlayerPackageV1 {
  version: typeof PLAYER_PACKAGE_VERSION;
  runtimeVersion: typeof PLAYER_RUNTIME_VERSION;
  schemaVersion: '2.0.0';
  scene: {
    svg: string;
    absoluteOpacityTargetIds?: string[];
  };
  animation: {
    timeline: AnimationTimeline;
    hierarchy: GroupHierarchy;
  };
  playback: {
    clipStart: number;
    clipEnd: number;
    camera: PlayerCamera;
  };
  dimensions: PlayerDimensions;
  poster: PlayerPosterMetadata;
  title?: string;
  attribution: PlayerAttribution;
}

export interface PlayerState {
  currentTimeMs: number;
  durationMs: number;
  rate: number;
  playing: boolean;
  ended: boolean;
}

export interface PlayerSceneAdapter {
  applyFrame(frame: FrameState): void;
  destroy(): void;
}

export interface PlayerTimingDriver {
  now(): number;
  request(callback: (timestamp: number) => void): number;
  cancel(handle: number): void;
}

export type PlayerStateListener = (state: Readonly<PlayerState>) => void;

/**
 * Shared types for the animate-excalidraw MCP server.
 * These mirror the main app's types but are standalone (no React/Zustand).
 */

export type AnimatableProperty =
  | 'opacity'
  | 'translateX'
  | 'translateY'
  | 'scaleX'
  | 'scaleY'
  | 'rotation'
  | 'drawProgress';

export type EasingType =
  | 'linear'
  | 'easeIn'
  | 'easeOut'
  | 'easeInOut'
  | 'easeInQuad'
  | 'easeOutQuad'
  | 'easeInOutQuad'
  | 'easeInCubic'
  | 'easeOutCubic'
  | 'easeInOutCubic'
  | 'easeInBack'
  | 'easeOutBack'
  | 'easeInOutBack'
  | 'easeInElastic'
  | 'easeOutElastic'
  | 'easeInBounce'
  | 'easeOutBounce'
  | 'step';

export interface Keyframe {
  id: string;
  time: number;
  value: number;
  easing: EasingType;
}

export interface AnimationTrack {
  id: string;
  targetId: string;
  targetType: 'element' | 'group';
  property: AnimatableProperty;
  keyframes: Keyframe[];
  enabled: boolean;
}

export interface AnimationTimeline {
  id: string;
  name: string;
  duration: number;
  fps: number;
  tracks: AnimationTrack[];
}

export interface CameraFrame {
  aspectRatio: '16:9' | '4:3' | '1:1' | '3:2';
  width: number;
  x: number;
  y: number;
}

export interface ServerState {
  scene: {
    elements: any[];
    files: Record<string, any>;
  };
  timeline: AnimationTimeline;
  clipStart: number;
  clipEnd: number;
  cameraFrame: CameraFrame;
}

export const PROPERTY_DEFAULTS: Record<AnimatableProperty, number> = {
  opacity: 1,
  translateX: 0,
  translateY: 0,
  scaleX: 1,
  scaleY: 1,
  rotation: 0,
  drawProgress: 1,
};

export const ANIMATABLE_PROPERTIES: readonly AnimatableProperty[] = [
  'opacity', 'translateX', 'translateY', 'scaleX', 'scaleY', 'rotation', 'drawProgress',
] as const;

export const EASING_TYPES: readonly EasingType[] = [
  'linear', 'easeIn', 'easeOut', 'easeInOut',
  'easeInQuad', 'easeOutQuad', 'easeInOutQuad',
  'easeInCubic', 'easeOutCubic', 'easeInOutCubic',
  'easeInBack', 'easeOutBack', 'easeInOutBack',
  'easeInElastic', 'easeOutElastic',
  'easeInBounce', 'easeOutBounce',
  'step',
] as const;

export const ASPECT_RATIOS: Record<string, number> = {
  '16:9': 16 / 9,
  '4:3': 4 / 3,
  '1:1': 1,
  '3:2': 3 / 2,
};

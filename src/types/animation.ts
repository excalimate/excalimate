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
  time: number; // ms from timeline start
  value: number;
  easing: EasingType; // easing to NEXT keyframe
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
  duration: number; // total duration in ms
  fps: number; // default 60
  tracks: AnimationTrack[];
}

export interface ElementAnimationState {
  targetId: string;
  opacity: number;
  translateX: number;
  translateY: number;
  scaleX: number;
  scaleY: number;
  rotation: number; // degrees
  drawProgress: number; // 0-1, for stroke-dashoffset draw animation
}

export type FrameState = Map<string, ElementAnimationState>;

// Property defaults (used when no keyframe exists)
export const PROPERTY_DEFAULTS: Record<AnimatableProperty, number> = {
  opacity: 1,
  translateX: 0,
  translateY: 0,
  scaleX: 1,
  scaleY: 1,
  rotation: 0,
  drawProgress: 1, // fully drawn by default
};

// All valid easing types for validation
export const EASING_TYPES: readonly EasingType[] = [
  'linear',
  'easeIn',
  'easeOut',
  'easeInOut',
  'easeInQuad',
  'easeOutQuad',
  'easeInOutQuad',
  'easeInCubic',
  'easeOutCubic',
  'easeInOutCubic',
  'easeInBack',
  'easeOutBack',
  'easeInOutBack',
  'easeInElastic',
  'easeOutElastic',
  'easeInBounce',
  'easeOutBounce',
  'step',
] as const;

export const ANIMATABLE_PROPERTIES: readonly AnimatableProperty[] = [
  'opacity',
  'translateX',
  'translateY',
  'scaleX',
  'scaleY',
  'rotation',
  'drawProgress',
] as const;

import {
  ANIMATABLE_PROPERTIES,
  EASING_TYPES,
} from '@excalimate/project-schema';
import type {
  AnimatableProperty,
  AnimationTimeline,
  AnimationTrack,
  EasingType,
  Keyframe,
} from '@excalimate/project-schema';

export type {
  AnimatableProperty,
  AnimationTimeline,
  AnimationTrack,
  EasingType,
  Keyframe,
};

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
export { ANIMATABLE_PROPERTIES, EASING_TYPES };

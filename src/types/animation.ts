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
import { PROPERTY_DEFAULTS } from '@excalimate/animation-core';
import type {
  ElementAnimationState,
  FrameState,
} from '@excalimate/animation-core';

export type {
  AnimatableProperty,
  AnimationTimeline,
  AnimationTrack,
  EasingType,
  Keyframe,
  ElementAnimationState,
  FrameState,
};
export { PROPERTY_DEFAULTS };

// All valid easing types for validation
export { ANIMATABLE_PROPERTIES, EASING_TYPES };

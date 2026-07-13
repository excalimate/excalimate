import type { ProjectDocument } from '@excalimate/project-schema';

export type {
  AnimatableProperty,
  AnimationAction,
  AnimationActionParameters,
  AnimationActionStatus,
  AnimationActionTiming,
  AnimationActionType,
  AnimationTimeline,
  AnimationTrack,
  CameraFrame,
  EasingType,
  GeneratedContentOwnership,
  Keyframe,
  Playback,
  ProjectAuthoring,
  ProjectDocument,
  ProjectScene,
} from '@excalimate/project-schema';
export {
  ANIMATABLE_PROPERTIES,
  CAMERA_FRAME_TARGET_ID,
  EASING_TYPES,
  PROJECT_LIMITS,
  PROJECT_VERSION,
} from '@excalimate/project-schema';
export { PROPERTY_DEFAULTS } from '@excalimate/animation-core';

export type ServerState = ProjectDocument;

export const ASPECT_RATIOS: Readonly<Record<string, number>> = {
  '16:9': 16 / 9,
  '4:3': 4 / 3,
  '1:1': 1,
  '3:2': 3 / 2,
};

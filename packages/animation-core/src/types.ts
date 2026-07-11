import type {
  AnimatableProperty,
  AnimationTimeline,
  AnimationTrack,
  Keyframe,
} from '@excalimate/project-schema';

export type {
  ActionStartMode,
  AnimatableProperty,
  AnimationAction,
  AnimationActionParameters,
  AnimationActionStatus,
  AnimationActionTiming,
  AnimationActionType,
  AnimationTimeline,
  AnimationTrack,
  EasingType,
  GeneratedContentOwnership,
  Keyframe,
  ProjectAuthoring,
  SlideDirection,
} from '@excalimate/project-schema';

export interface ElementAnimationState {
  targetId: string;
  opacity: number;
  translateX: number;
  translateY: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
  drawProgress: number;
}

export type FrameState = Map<string, ElementAnimationState>;

export interface GroupHierarchy {
  [groupId: string]: string[];
}

export interface RuntimeRevisions {
  timelineRevision: number;
  hierarchyRevision: number;
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

export interface CompiledSegment {
  startTime: number;
  endTime: number;
  startValue: number;
  endValue: number;
  easing: Keyframe['easing'];
  inverseDuration: number;
}

export interface CompiledTrack {
  id: string;
  targetId: string;
  targetType: AnimationTrack['targetType'];
  property: AnimatableProperty;
  keyframes: readonly Keyframe[];
  segments: readonly CompiledSegment[];
}

export interface CompiledTimeline {
  source: AnimationTimeline;
  revision: number;
  tracksByTarget: ReadonlyMap<
    string,
    ReadonlyMap<AnimatableProperty, CompiledTrack>
  >;
}

import type {
  AnimatableProperty,
  AnimationTimeline,
  AnimationTrack,
} from '@excalimate/project-schema';
import { AnimationTimelineSchema } from '@excalimate/project-schema';
import { interpolateCompiledTrack } from './interpolation.js';
import type {
  CompiledTimeline,
  CompiledTrack,
  ElementAnimationState,
  FrameState,
  GroupHierarchy,
  RuntimeRevisions,
} from './types.js';
import { PROPERTY_DEFAULTS } from './types.js';
import { sortKeyframes } from './models.js';

const EMPTY_GROUP_HIERARCHY: GroupHierarchy = Object.freeze({});

export function createDefaultState(targetId: string): ElementAnimationState {
  return {
    targetId,
    opacity: PROPERTY_DEFAULTS.opacity,
    translateX: PROPERTY_DEFAULTS.translateX,
    translateY: PROPERTY_DEFAULTS.translateY,
    scaleX: PROPERTY_DEFAULTS.scaleX,
    scaleY: PROPERTY_DEFAULTS.scaleY,
    rotation: PROPERTY_DEFAULTS.rotation,
    drawProgress: PROPERTY_DEFAULTS.drawProgress,
  };
}

export function composeStates(
  group: ElementAnimationState,
  element: ElementAnimationState,
): ElementAnimationState {
  return {
    targetId: element.targetId,
    opacity: group.opacity * element.opacity,
    translateX: group.translateX + element.translateX * group.scaleX,
    translateY: group.translateY + element.translateY * group.scaleY,
    scaleX: group.scaleX * element.scaleX,
    scaleY: group.scaleY * element.scaleY,
    rotation: group.rotation + element.rotation,
    drawProgress: element.drawProgress,
  };
}

function compileTrack(track: AnimationTrack): CompiledTrack {
  const keyframes = sortKeyframes(track.keyframes);
  return {
    id: track.id,
    targetId: track.targetId,
    targetType: track.targetType,
    property: track.property,
    keyframes,
    segments: keyframes.slice(0, -1).map((keyframe, index) => {
      const next = keyframes[index + 1];
      if (!next) {
        throw new Error(`Track "${track.id}" has an invalid keyframe segment`);
      }
      const duration = next.time - keyframe.time;
      return {
        startTime: keyframe.time,
        endTime: next.time,
        startValue: keyframe.value,
        endValue: next.value,
        easing: keyframe.easing,
        inverseDuration: duration > 0 ? 1 / duration : 0,
      };
    }),
  };
}

export function compileTimeline(
  timeline: AnimationTimeline,
  revision = 0,
): CompiledTimeline {
  const validation = AnimationTimelineSchema.safeParse(timeline);
  if (!validation.success) {
    const issue = validation.error.issues[0];
    throw new Error(
      `Invalid animation timeline${issue ? `: ${issue.message}` : ''}`,
    );
  }
  const mutableTargets = new Map<
    string,
    Map<AnimatableProperty, CompiledTrack>
  >();
  for (const track of validation.data.tracks) {
    if (!track.enabled || track.keyframes.length === 0) continue;
    let properties = mutableTargets.get(track.targetId);
    if (!properties) {
      properties = new Map();
      mutableTargets.set(track.targetId, properties);
    }
    properties.set(track.property, compileTrack(track));
  }
  return {
    source: timeline,
    revision,
    tracksByTarget: mutableTargets,
  };
}

function computeRawStates(
  timeline: CompiledTimeline,
  time: number,
): Map<string, ElementAnimationState> {
  const states = new Map<string, ElementAnimationState>();
  for (const [targetId, tracks] of timeline.tracksByTarget) {
    const state = createDefaultState(targetId);
    for (const track of tracks.values()) {
      state[track.property] = interpolateCompiledTrack(track, time);
    }
    states.set(targetId, state);
  }
  return states;
}

export function compileHierarchyOrder(
  hierarchy: GroupHierarchy,
): readonly string[] {
  const groups = Object.keys(hierarchy);
  const groupSet = new Set(groups);
  const depthByGroup = new Map<string, number>();
  const getDepth = (groupId: string, visiting: Set<string>): number => {
    const cached = depthByGroup.get(groupId);
    if (cached !== undefined) return cached;
    if (visiting.has(groupId)) return 0;
    const nextVisiting = new Set(visiting).add(groupId);
    let depth = 0;
    for (const possibleParent of groups) {
      if (
        possibleParent !== groupId &&
        hierarchy[possibleParent]?.includes(groupId) &&
        groupSet.has(possibleParent)
      ) {
        depth = Math.max(depth, getDepth(possibleParent, nextVisiting) + 1);
      }
    }
    depthByGroup.set(groupId, depth);
    return depth;
  };
  return groups.sort(
    (left, right) =>
      getDepth(left, new Set()) - getDepth(right, new Set()) ||
      left.localeCompare(right),
  );
}

export function computeCompiledFrame(
  timeline: CompiledTimeline,
  time: number,
  hierarchy: GroupHierarchy = EMPTY_GROUP_HIERARCHY,
  hierarchyOrder = compileHierarchyOrder(hierarchy),
): FrameState {
  const frameState: FrameState = new Map();
  const rawStates = computeRawStates(timeline, time);

  for (const groupId of hierarchyOrder) {
    const memberIds = hierarchy[groupId] ?? [];
    const groupState =
      frameState.get(groupId) ??
      rawStates.get(groupId) ??
      createDefaultState(groupId);
    if (rawStates.has(groupId)) frameState.set(groupId, groupState);
    for (const memberId of memberIds) {
      const memberState =
        frameState.get(memberId) ??
        rawStates.get(memberId) ??
        createDefaultState(memberId);
      frameState.set(memberId, composeStates(groupState, memberState));
      rawStates.delete(memberId);
    }
  }

  for (const [targetId, state] of rawStates) {
    if (!frameState.has(targetId)) frameState.set(targetId, state);
  }
  return frameState;
}

export class AnimationEngine {
  private compiled: CompiledTimeline | null = null;
  private timelineReference: AnimationTimeline | null = null;
  private implicitTimelineRevision = 0;
  private hierarchyReference: GroupHierarchy | null = null;
  private implicitHierarchyRevision = 0;
  private compiledHierarchyRevision = -1;
  private hierarchyOrder: readonly string[] = [];
  private cacheKey = '';
  private lastFrameState: FrameState = new Map();

  computeFrame(
    timeline: AnimationTimeline,
    time: number,
    hierarchy: GroupHierarchy = EMPTY_GROUP_HIERARCHY,
    revisions?: Partial<RuntimeRevisions>,
  ): FrameState {
    if (timeline !== this.timelineReference) {
      this.timelineReference = timeline;
      this.implicitTimelineRevision += 1;
    }
    if (hierarchy !== this.hierarchyReference) {
      this.hierarchyReference = hierarchy;
      this.implicitHierarchyRevision += 1;
    }
    const timelineRevision =
      revisions?.timelineRevision ?? this.implicitTimelineRevision;
    const hierarchyRevision =
      revisions?.hierarchyRevision ?? this.implicitHierarchyRevision;
    if (hierarchyRevision !== this.compiledHierarchyRevision) {
      this.hierarchyOrder = compileHierarchyOrder(hierarchy);
      this.compiledHierarchyRevision = hierarchyRevision;
    }
    if (
      !this.compiled ||
      this.compiled.source !== timeline ||
      this.compiled.revision !== timelineRevision
    ) {
      this.compiled = compileTimeline(timeline, timelineRevision);
      this.cacheKey = '';
    }
    const cacheKey = `${timelineRevision}:${hierarchyRevision}:${time}`;
    if (cacheKey === this.cacheKey) return this.lastFrameState;
    this.lastFrameState = computeCompiledFrame(
      this.compiled,
      time,
      hierarchy,
      this.hierarchyOrder,
    );
    this.cacheKey = cacheKey;
    return this.lastFrameState;
  }

  invalidateCache(): void {
    this.compiled = null;
    this.compiledHierarchyRevision = -1;
    this.cacheKey = '';
    this.lastFrameState = new Map();
  }

  static getAnimatedTargets(timeline: AnimationTimeline): Set<string> {
    return new Set(timeline.tracks.map((track) => track.targetId));
  }

  static getEffectiveDuration(timeline: AnimationTimeline): number {
    let maximum = timeline.duration;
    for (const track of timeline.tracks) {
      for (const keyframe of track.keyframes) {
        maximum = Math.max(maximum, keyframe.time);
      }
    }
    return maximum;
  }
}

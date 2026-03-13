/**
 * Core animation engine.
 * Takes a Timeline + current time and computes the full FrameState.
 * Resolves group hierarchy so group transforms cascade to children.
 */

import type {
  AnimationTimeline,
  AnimationTrack,
  ElementAnimationState,
  FrameState,
} from '../../types/animation';
import { PROPERTY_DEFAULTS } from '../../types/animation';
import { interpolate } from './InterpolationEngine';

/**
 * Default animation state for an element (no animation applied).
 */
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

/**
 * Group tracks by targetId for efficient lookup.
 */
function groupTracksByTarget(tracks: readonly AnimationTrack[]): Map<string, AnimationTrack[]> {
  const map = new Map<string, AnimationTrack[]>();
  for (const track of tracks) {
    if (!track.enabled) continue;
    const existing = map.get(track.targetId);
    if (existing) {
      existing.push(track);
    } else {
      map.set(track.targetId, [track]);
    }
  }
  return map;
}

/**
 * Compute the animation state for a single target at a given time.
 */
function computeTargetState(
  targetId: string,
  tracks: readonly AnimationTrack[],
  time: number,
): ElementAnimationState {
  const state = createDefaultState(targetId);

  for (const track of tracks) {
    if (track.keyframes.length === 0) continue;
    const value = interpolate(track.keyframes, time, track.property);
    state[track.property] = value;
  }

  return state;
}

/**
 * Compose a group's animation state with an element's animation state.
 * Group transforms cascade: translations add, scales multiply,
 * rotations add, opacity multiplies.
 */
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

/**
 * Mapping of group ID → member element IDs.
 * Used to cascade group transforms to children.
 */
export interface GroupHierarchy {
  [groupId: string]: string[];
}

export class AnimationEngine {
  private _lastTime: number = -1;
  private _lastFrameState: FrameState = new Map();

  /**
   * Compute the full frame state for all animated targets at the given time.
   *
   * @param timeline - The animation timeline containing all tracks
   * @param time - Current time in milliseconds
   * @param groupHierarchy - Mapping of group IDs to their member element IDs
   * @returns FrameState map of targetId → ElementAnimationState
   */
  computeFrame(
    timeline: AnimationTimeline,
    time: number,
    groupHierarchy: GroupHierarchy = {},
  ): FrameState {
    // Memoization: return cached result if time hasn't changed
    if (time === this._lastTime) {
      return this._lastFrameState;
    }

    const frameState: FrameState = new Map();
    const tracksByTarget = groupTracksByTarget(timeline.tracks);

    // First pass: compute raw animation state for each target with tracks
    const rawStates = new Map<string, ElementAnimationState>();
    for (const [targetId, tracks] of tracksByTarget) {
      rawStates.set(targetId, computeTargetState(targetId, tracks, time));
    }

    // Second pass: apply group hierarchy
    // For each group that has animation, cascade its transform to children
    for (const [groupId, memberIds] of Object.entries(groupHierarchy)) {
      const groupState = rawStates.get(groupId) ?? createDefaultState(groupId);

      // If the group has animation, add it to the frame state
      if (rawStates.has(groupId)) {
        frameState.set(groupId, groupState);
      }

      // Cascade group transforms to each member element
      for (const memberId of memberIds) {
        const memberState = rawStates.get(memberId) ?? createDefaultState(memberId);
        const composedState = composeStates(groupState, memberState);
        frameState.set(memberId, composedState);
        // Remove from rawStates so we don't double-add below
        rawStates.delete(memberId);
      }
    }

    // Third pass: add remaining non-grouped targets
    for (const [targetId, state] of rawStates) {
      if (!frameState.has(targetId)) {
        frameState.set(targetId, state);
      }
    }

    this._lastTime = time;
    this._lastFrameState = frameState;
    return frameState;
  }

  /**
   * Invalidate the memoization cache.
   * Call this when the timeline structure changes (tracks/keyframes added/removed).
   */
  invalidateCache(): void {
    this._lastTime = -1;
    this._lastFrameState = new Map();
  }

  /**
   * Get all unique target IDs referenced by a timeline's tracks.
   */
  static getAnimatedTargets(timeline: AnimationTimeline): Set<string> {
    const targets = new Set<string>();
    for (const track of timeline.tracks) {
      targets.add(track.targetId);
    }
    return targets;
  }

  /**
   * Get the computed duration of the animation (time of last keyframe).
   * Returns the timeline's declared duration or the time of the last keyframe, whichever is greater.
   */
  static getEffectiveDuration(timeline: AnimationTimeline): number {
    let maxTime = 0;
    for (const track of timeline.tracks) {
      for (const kf of track.keyframes) {
        if (kf.time > maxTime) {
          maxTime = kf.time;
        }
      }
    }
    return Math.max(timeline.duration, maxTime);
  }
}

/**
 * Server state management — in-memory state for the current MCP session.
 */

import { nanoid } from 'nanoid';
import type { ServerState, AnimationTimeline, AnimationTrack, Keyframe, AnimatableProperty, EasingType, CameraFrame } from './types.js';
import { PROPERTY_DEFAULTS } from './types.js';

export function createDefaultState(): ServerState {
  return {
    scene: { elements: [], files: {} },
    timeline: {
      id: nanoid(),
      name: 'Timeline 1',
      duration: 30000,
      fps: 30,
      tracks: [],
    },
    clipStart: 0,
    clipEnd: 10000,
    cameraFrame: { aspectRatio: '16:9', width: 1200, x: 0, y: 0 },
  };
}

// ── Track/Keyframe helpers ────────────────────────────────────

export function createTrack(
  targetId: string,
  targetType: 'element' | 'group',
  property: AnimatableProperty,
): AnimationTrack {
  return {
    id: nanoid(),
    targetId,
    targetType,
    property,
    keyframes: [],
    enabled: true,
  };
}

export function createKeyframe(time: number, value: number, easing: EasingType = 'linear'): Keyframe {
  return { id: nanoid(), time, value, easing };
}

export function addKeyframeToTrack(track: AnimationTrack, kf: Keyframe): AnimationTrack {
  const keyframes = [...track.keyframes, kf].sort((a, b) => a.time - b.time);
  return { ...track, keyframes };
}

export function removeKeyframeFromTrack(track: AnimationTrack, keyframeId: string): AnimationTrack {
  return { ...track, keyframes: track.keyframes.filter(kf => kf.id !== keyframeId) };
}

export function ensureTrack(
  state: ServerState,
  targetId: string,
  property: AnimatableProperty,
): { state: ServerState; track: AnimationTrack } {
  let track = state.timeline.tracks.find(
    t => t.targetId === targetId && t.property === property,
  );
  if (!track) {
    const targetType = state.scene.elements.some((e: any) => e.id === targetId) ? 'element' as const : 'group' as const;
    track = createTrack(targetId, targetType, property);
    state = {
      ...state,
      timeline: {
        ...state.timeline,
        tracks: [...state.timeline.tracks, track],
      },
    };
  }
  return { state, track };
}

export function addKeyframeToState(
  state: ServerState,
  targetId: string,
  property: AnimatableProperty,
  time: number,
  value: number,
  easing: EasingType = 'linear',
): ServerState {
  const { state: s, track } = ensureTrack(state, targetId, property);
  const kf = createKeyframe(time, value, easing);
  const updatedTrack = addKeyframeToTrack(track, kf);
  return {
    ...s,
    timeline: {
      ...s.timeline,
      tracks: s.timeline.tracks.map(t => t.id === updatedTrack.id ? updatedTrack : t),
    },
  };
}

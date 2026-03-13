import { create } from 'zustand';
import type {
  AnimationTimeline,
  AnimationTrack,
  Keyframe,
  AnimatableProperty,
  EasingType,
} from '../types/animation';
import { createKeyframe } from '../core/models/Keyframe';
import {
  createTrack,
  addKeyframeToTrack,
  removeKeyframeFromTrack,
  updateKeyframeInTrack,
} from '../core/models/Track';
import {
  createTimeline,
  addTrackToTimeline,
  removeTrackFromTimeline,
  updateTrackInTimeline,
  findTracksForTarget,
} from '../core/models/Timeline';

interface AnimationState {
  // State
  timeline: AnimationTimeline;
  selectedTrackId: string | null;
  selectedKeyframeIds: string[];
  clipboardKeyframes: Keyframe[];
  /** Clip render range — start time in ms */
  clipStart: number;
  /** Clip render range — end time in ms */
  clipEnd: number;

  // Track actions
  addTrack: (
    targetId: string,
    targetType: 'element' | 'group',
    property: AnimatableProperty,
  ) => void;
  removeTrack: (trackId: string) => void;
  toggleTrackEnabled: (trackId: string) => void;
  selectTrack: (trackId: string | null) => void;

  // Keyframe actions
  addKeyframe: (
    trackId: string,
    time: number,
    value: number,
    easing?: EasingType,
  ) => void;
  removeKeyframe: (trackId: string, keyframeId: string) => void;
  updateKeyframe: (
    trackId: string,
    keyframeId: string,
    updates: Partial<Pick<Keyframe, 'time' | 'value' | 'easing'>>,
  ) => void;
  moveKeyframe: (
    trackId: string,
    keyframeId: string,
    newTime: number,
  ) => void;
  selectKeyframes: (ids: string[]) => void;
  clearKeyframeSelection: () => void;

  // Clipboard
  copySelectedKeyframes: () => void;
  pasteKeyframes: (trackId: string, timeOffset: number) => void;

  // Bulk
  setTimeline: (timeline: AnimationTimeline) => void;
  setTimelineDuration: (duration: number) => void;
  setTimelineFps: (fps: number) => void;
  setClipRange: (start: number, end: number) => void;

  // Selectors
  getTrack: (trackId: string) => AnimationTrack | undefined;
  getTracksForTarget: (targetId: string) => AnimationTrack[];
  getSelectedTrack: () => AnimationTrack | undefined;
}

export const useAnimationStore = create<AnimationState>()((set, get) => ({
  timeline: createTimeline(),
  selectedTrackId: null,
  selectedKeyframeIds: [],
  clipboardKeyframes: [],
  clipStart: 0,
  clipEnd: 10000, // Default 10s clip

  // Track actions
  addTrack: (
    targetId: string,
    targetType: 'element' | 'group',
    property: AnimatableProperty,
  ): void => {
    const track = createTrack(targetId, targetType, property);
    set((state) => ({
      timeline: addTrackToTimeline(state.timeline, track),
    }));
  },

  removeTrack: (trackId: string): void => {
    set((state) => ({
      timeline: removeTrackFromTimeline(state.timeline, trackId),
      selectedTrackId:
        state.selectedTrackId === trackId ? null : state.selectedTrackId,
    }));
  },

  toggleTrackEnabled: (trackId: string): void => {
    const track = get().timeline.tracks.find((t) => t.id === trackId);
    if (!track) return;
    set((state) => ({
      timeline: updateTrackInTimeline(state.timeline, trackId, {
        enabled: !track.enabled,
      }),
    }));
  },

  selectTrack: (trackId: string | null): void => {
    set({ selectedTrackId: trackId });
  },

  // Keyframe actions
  addKeyframe: (
    trackId: string,
    time: number,
    value: number,
    easing?: EasingType,
  ): void => {
    const keyframe = createKeyframe(time, value, easing);
    const track = get().timeline.tracks.find((t) => t.id === trackId);
    if (!track) return;
    const updatedTrack = addKeyframeToTrack(track, keyframe);
    set((state) => ({
      timeline: updateTrackInTimeline(state.timeline, trackId, {
        keyframes: updatedTrack.keyframes,
      }),
    }));
  },

  removeKeyframe: (trackId: string, keyframeId: string): void => {
    const track = get().timeline.tracks.find((t) => t.id === trackId);
    if (!track) return;
    const updatedTrack = removeKeyframeFromTrack(track, keyframeId);
    set((state) => ({
      timeline: updateTrackInTimeline(state.timeline, trackId, {
        keyframes: updatedTrack.keyframes,
      }),
      selectedKeyframeIds: state.selectedKeyframeIds.filter(
        (id) => id !== keyframeId,
      ),
    }));
  },

  updateKeyframe: (
    trackId: string,
    keyframeId: string,
    updates: Partial<Pick<Keyframe, 'time' | 'value' | 'easing'>>,
  ): void => {
    const track = get().timeline.tracks.find((t) => t.id === trackId);
    if (!track) return;
    const updatedTrack = updateKeyframeInTrack(track, keyframeId, updates);
    set((state) => ({
      timeline: updateTrackInTimeline(state.timeline, trackId, {
        keyframes: updatedTrack.keyframes,
      }),
    }));
  },

  moveKeyframe: (
    trackId: string,
    keyframeId: string,
    newTime: number,
  ): void => {
    const track = get().timeline.tracks.find((t) => t.id === trackId);
    if (!track) return;
    const updatedTrack = updateKeyframeInTrack(track, keyframeId, {
      time: newTime,
    });
    set((state) => ({
      timeline: updateTrackInTimeline(state.timeline, trackId, {
        keyframes: updatedTrack.keyframes,
      }),
    }));
  },

  selectKeyframes: (ids: string[]): void => {
    set({ selectedKeyframeIds: ids });
  },

  clearKeyframeSelection: (): void => {
    set({ selectedKeyframeIds: [] });
  },

  // Clipboard
  copySelectedKeyframes: (): void => {
    const { selectedKeyframeIds, timeline } = get();
    const allKeyframes = timeline.tracks.flatMap((t) => t.keyframes);
    const copied = allKeyframes.filter((kf) =>
      selectedKeyframeIds.includes(kf.id),
    );
    set({ clipboardKeyframes: copied });
  },

  pasteKeyframes: (trackId: string, timeOffset: number): void => {
    const { clipboardKeyframes } = get();
    if (clipboardKeyframes.length === 0) return;
    const track = get().timeline.tracks.find((t) => t.id === trackId);
    if (!track) return;

    let updatedTrack = track;
    for (const kf of clipboardKeyframes) {
      const newKf = createKeyframe(kf.time + timeOffset, kf.value, kf.easing);
      updatedTrack = addKeyframeToTrack(updatedTrack, newKf);
    }
    set((state) => ({
      timeline: updateTrackInTimeline(state.timeline, trackId, {
        keyframes: updatedTrack.keyframes,
      }),
    }));
  },

  // Bulk
  setTimeline: (timeline: AnimationTimeline): void => {
    set({ timeline });
  },

  setTimelineDuration: (duration: number): void => {
    set((state) => ({
      timeline: { ...state.timeline, duration },
    }));
  },

  setTimelineFps: (fps: number): void => {
    set((state) => ({
      timeline: { ...state.timeline, fps },
    }));
  },

  setClipRange: (start: number, end: number): void => {
    set({ clipStart: Math.max(0, start), clipEnd: Math.max(start + 100, end) });
  },

  // Selectors
  getTrack: (trackId: string): AnimationTrack | undefined => {
    return get().timeline.tracks.find((t) => t.id === trackId);
  },

  getTracksForTarget: (targetId: string): AnimationTrack[] => {
    return findTracksForTarget(get().timeline, targetId);
  },

  getSelectedTrack: (): AnimationTrack | undefined => {
    const { selectedTrackId, timeline } = get();
    if (!selectedTrackId) return undefined;
    return timeline.tracks.find((t) => t.id === selectedTrackId);
  },
}));

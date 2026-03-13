import { useCallback } from 'react';
import { useAnimationStore } from '../stores/animationStore';
import type { AnimatableProperty, EasingType, Keyframe } from '../types/animation';

export function useKeyframes() {
  const store = useAnimationStore();

  const addKeyframe = useCallback(
    (trackId: string, time: number, value: number, easing?: EasingType) => {
      store.addKeyframe(trackId, time, value, easing);
    },
    [store],
  );

  const removeKeyframe = useCallback(
    (trackId: string, keyframeId: string) => {
      store.removeKeyframe(trackId, keyframeId);
    },
    [store],
  );

  const updateKeyframe = useCallback(
    (
      trackId: string,
      keyframeId: string,
      updates: Partial<Pick<Keyframe, 'time' | 'value' | 'easing'>>,
    ) => {
      store.updateKeyframe(trackId, keyframeId, updates);
    },
    [store],
  );

  const moveKeyframe = useCallback(
    (trackId: string, keyframeId: string, newTime: number) => {
      store.moveKeyframe(trackId, keyframeId, newTime);
    },
    [store],
  );

  const addTrack = useCallback(
    (
      targetId: string,
      targetType: 'element' | 'group',
      property: AnimatableProperty,
    ) => {
      store.addTrack(targetId, targetType, property);
    },
    [store],
  );

  return {
    addKeyframe,
    removeKeyframe,
    updateKeyframe,
    moveKeyframe,
    addTrack,
    removeTrack: store.removeTrack,
    toggleTrackEnabled: store.toggleTrackEnabled,
    selectTrack: store.selectTrack,
    selectKeyframes: store.selectKeyframes,
    selectedTrackId: store.selectedTrackId,
    selectedKeyframeIds: store.selectedKeyframeIds,
    timeline: store.timeline,
  };
}

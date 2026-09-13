import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import type { AnimationTimeline } from '../../types/animation';
import { useAnimationStore } from '../../stores/animationStore';
import { useUndoRedoStore } from '../../stores/undoRedoStore';
import { useUIStore } from '../../stores/uiStore';
import { useKeyframeActions } from './useKeyframeActions';

const timeline: AnimationTimeline = {
  id: 'timeline',
  name: 'Timeline',
  duration: 1000,
  fps: 60,
  tracks: [
    {
      id: 'track',
      targetId: 'element',
      targetType: 'element',
      property: 'opacity',
      enabled: true,
      keyframes: [
        { id: 'a', time: 100, value: 0, easing: 'linear' },
        { id: 'b', time: 300, value: 1, easing: 'linear' },
      ],
    },
  ],
};

describe('useKeyframeActions', () => {
  beforeEach(() => {
    useAnimationStore.setState({
      timeline: structuredClone(timeline),
      selectedKeyframeIds: ['a', 'b'],
      actions: [],
      sceneStates: [],
      sceneTransitions: [],
      timelineRevision: 0,
      documentRevision: 0,
    });
    useUndoRedoStore.getState().clearHistory();
    useUIStore.setState({ liveMode: false });
  });

  it('records a multi-keyframe drag as one undoable action', () => {
    const { result, unmount } = renderHook(() => useKeyframeActions());

    act(() => {
      expect(result.current.handleMoveKeyframes(['a', 'b'], 100)).toBe(100);
      expect(result.current.handleMoveKeyframes(['a', 'b'], 100)).toBe(100);
      result.current.handleEndKeyframeDrag();
    });

    expect(
      useAnimationStore.getState().timeline.tracks[0].keyframes.map(({ time }) => time),
    ).toEqual([300, 500]);
    expect(useUndoRedoStore.getState().past).toHaveLength(1);

    act(() => {
      useUndoRedoStore.getState().undo();
    });

    expect(
      useAnimationStore.getState().timeline.tracks[0].keyframes.map(({ time }) => time),
    ).toEqual([100, 300]);

    unmount();
  });
});

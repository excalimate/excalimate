import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import type { AnimationTimeline } from '../../types/animation';
import { useAnimationStore } from '../../stores/animationStore';
import { usePlaybackStore } from '../../stores/playbackStore';
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
    usePlaybackStore.setState({ currentTime: 0 });
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

  it('starts canvas dragging from the interpolated position', () => {
    useAnimationStore.setState({
      timeline: {
        ...structuredClone(timeline),
        tracks: [
          {
            id: 'translate-x',
            targetId: 'element',
            targetType: 'element',
            property: 'translateX',
            enabled: true,
            keyframes: [
              { id: 'start', time: 0, value: 0, easing: 'linear' },
              { id: 'end', time: 1000, value: 100, easing: 'linear' },
            ],
          },
        ],
      },
    });
    usePlaybackStore.setState({ currentTime: 500 });
    const { result } = renderHook(() => useKeyframeActions());

    act(() => {
      result.current.handleDragElement('element', 10, 0);
    });

    const track = useAnimationStore.getState().timeline.tracks[0];
    expect(track.keyframes.find((keyframe) => keyframe.time === 500)?.value).toBe(60);
  });

  it('starts canvas resizing and rotation from interpolated values', () => {
    useAnimationStore.setState({
      timeline: {
        ...structuredClone(timeline),
        tracks: [
          {
            id: 'scale-x',
            targetId: 'element',
            targetType: 'element',
            property: 'scaleX',
            enabled: true,
            keyframes: [
              { id: 'scale-start', time: 0, value: 1, easing: 'linear' },
              { id: 'scale-end', time: 1000, value: 2, easing: 'linear' },
            ],
          },
          {
            id: 'rotation',
            targetId: 'element',
            targetType: 'element',
            property: 'rotation',
            enabled: true,
            keyframes: [
              { id: 'rotation-start', time: 0, value: 0, easing: 'linear' },
              { id: 'rotation-end', time: 1000, value: 90, easing: 'linear' },
            ],
          },
        ],
      },
    });
    usePlaybackStore.setState({ currentTime: 500 });
    const { result } = renderHook(() => useKeyframeActions());

    act(() => {
      result.current.handleResizeElement('element', 0.1, 0);
      result.current.handleRotateElement('element', Math.PI / 18);
    });

    const tracks = useAnimationStore.getState().timeline.tracks;
    expect(
      tracks
        .find((track) => track.id === 'scale-x')
        ?.keyframes.find((keyframe) => keyframe.time === 500)?.value,
    ).toBeCloseTo(1.6);
    expect(
      tracks
        .find((track) => track.id === 'rotation')
        ?.keyframes.find((keyframe) => keyframe.time === 500)?.value,
    ).toBeCloseTo(55);
  });
});

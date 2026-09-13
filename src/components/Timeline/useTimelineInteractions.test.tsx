import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { RefObject } from 'react';
import { useTimelineInteractions } from './useTimelineInteractions';

class ResizeObserverMock {
  observe() {}
  disconnect() {}
}

describe('useTimelineInteractions', () => {
  it('clears explicit keyframe selection when empty timeline space is clicked', () => {
    vi.stubGlobal('ResizeObserver', ResizeObserverMock);
    const area = document.createElement('div');
    const trackList = document.createElement('div');
    const scrollArea = document.createElement('div');
    document.body.append(area, trackList, scrollArea);
    vi.spyOn(scrollArea, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: 500,
      bottom: 200,
      width: 500,
      height: 200,
      toJSON: () => ({}),
    });
    const onSelectKeyframes = vi.fn();

    const { result, unmount } = renderHook(() =>
      useTimelineInteractions({
        keyframeAreaRef: { current: area } as RefObject<HTMLDivElement>,
        trackListRef: { current: trackList } as RefObject<HTMLDivElement>,
        keyframeScrollRef: { current: scrollArea } as RefObject<HTMLDivElement>,
        rows: [],
        tracks: [],
        duration: 1000,
        fps: 60,
        zoom: 1,
        scrollX: 0,
        onViewportChange: vi.fn(),
        onScrollXChange: vi.fn(),
        onViewportWidthChange: vi.fn(),
        clipStart: 0,
        clipEnd: 1000,
        selectedElementIds: [],
        onSelectKeyframes,
        selectedKeyframeIds: ['selected'],
        onAddKeyframe: vi.fn(),
        onMoveKeyframes: vi.fn(() => 0),
        onEndKeyframeDrag: vi.fn(),
        onScrub: vi.fn(),
        onClipRangeChange: vi.fn(),
      }),
    );

    act(() => {
      result.current.handleMarqueeStart({
        button: 0,
        clientX: 120,
        clientY: 60,
        shiftKey: false,
        ctrlKey: false,
        metaKey: false,
        preventDefault: vi.fn(),
      } as never);
      document.dispatchEvent(new MouseEvent('mouseup', { clientX: 120, clientY: 60 }));
    });

    expect(onSelectKeyframes).toHaveBeenCalledWith([]);

    unmount();
    area.remove();
    trackList.remove();
    scrollArea.remove();
    vi.unstubAllGlobals();
  });

  it('snaps a grouped drag by its anchor keyframe and preserves the group delta', () => {
    vi.stubGlobal('ResizeObserver', ResizeObserverMock);
    const area = document.createElement('div');
    const trackList = document.createElement('div');
    const scrollArea = document.createElement('div');
    document.body.append(area, trackList, scrollArea);
    const onMoveKeyframes = vi.fn((_ids: string[], delta: number) => delta);
    const onEndKeyframeDrag = vi.fn();

    const { result, unmount } = renderHook(() =>
      useTimelineInteractions({
        keyframeAreaRef: { current: area } as RefObject<HTMLDivElement>,
        trackListRef: { current: trackList } as RefObject<HTMLDivElement>,
        keyframeScrollRef: { current: scrollArea } as RefObject<HTMLDivElement>,
        rows: [],
        tracks: [
          {
            id: 'track',
            targetId: 'element',
            targetType: 'element',
            property: 'opacity',
            enabled: true,
            keyframes: [
              { id: 'anchor', time: 100, value: 0, easing: 'linear' },
              { id: 'peer', time: 275, value: 1, easing: 'linear' },
            ],
          },
        ],
        duration: 1000,
        fps: 60,
        zoom: 1,
        scrollX: 0,
        onViewportChange: vi.fn(),
        onScrollXChange: vi.fn(),
        onViewportWidthChange: vi.fn(),
        clipStart: 0,
        clipEnd: 1000,
        selectedElementIds: [],
        onSelectKeyframes: vi.fn(),
        selectedKeyframeIds: ['anchor', 'peer'],
        onAddKeyframe: vi.fn(),
        onMoveKeyframes,
        onEndKeyframeDrag,
        onScrub: vi.fn(),
        onClipRangeChange: vi.fn(),
      }),
    );

    act(() => {
      result.current.handleKeyframeDragStart(
        'anchor',
        0,
        ['anchor', 'peer'],
        vi.fn(),
      );
      document.dispatchEvent(new MouseEvent('mousemove', { clientX: 20 }));
      document.dispatchEvent(new MouseEvent('mouseup', { clientX: 20 }));
    });

    expect(onMoveKeyframes).toHaveBeenCalledTimes(1);
    expect(onMoveKeyframes.mock.calls[0][0]).toEqual(['anchor', 'peer']);
    expect(onMoveKeyframes.mock.calls[0][1]).toBeCloseTo(16.6666667);
    expect(onEndKeyframeDrag).toHaveBeenCalledOnce();

    unmount();
    area.remove();
    trackList.remove();
    scrollArea.remove();
    vi.unstubAllGlobals();
  });
});

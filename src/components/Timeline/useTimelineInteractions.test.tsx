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
        currentTime: 0,
        zoom: 1,
        setZoom: vi.fn(),
        scrollX: 0,
        setScrollX: vi.fn(),
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
});

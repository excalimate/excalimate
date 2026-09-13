import { describe, expect, it } from 'vitest';
import {
  clampTimelineScroll,
  clampTimelineZoom,
  getPlayheadZoomAnchorX,
  getScrollToKeepTimeVisible,
  getTimelineViewportAtTime,
  getTimelineMaxScroll,
  getZoomedTimelineViewport,
} from './timelineMath';

describe('timeline viewport math', () => {
  it('clamps shortcut zoom to the supported range', () => {
    expect(clampTimelineZoom(2, 0.02, 1)).toBe(1);
    expect(clampTimelineZoom(0.001, 0.02, 1)).toBe(0.02);
  });

  it('keeps the time under the pointer fixed while zooming', () => {
    const result = getZoomedTimelineViewport({
      duration: 30_000,
      oldZoom: 0.1,
      newZoom: 0.2,
      scrollX: 1_000,
      viewportWidth: 800,
      anchorX: 250,
    });

    expect(result.zoom).toBe(0.2);
    expect(result.scrollX).toBe(2_250);
    expect((result.scrollX + 250) / result.zoom).toBe(12_500);
  });

  it('clamps zoom scrolling while retaining access to the full duration', () => {
    expect(getTimelineMaxScroll(30_000, 0.2, 800)).toBe(5_200);
    expect(clampTimelineScroll(-50, 30_000, 0.2, 800)).toBe(0);
    expect(clampTimelineScroll(8_000, 30_000, 0.2, 800)).toBe(5_200);
  });

  it('anchors keyboard zoom to a visible playhead or the viewport center', () => {
    expect(getPlayheadZoomAnchorX(5_000, 0.1, 200, 800)).toBe(300);
    expect(getPlayheadZoomAnchorX(20_000, 0.1, 200, 800)).toBe(400);

    const viewport = getTimelineViewportAtTime({
      duration: 30_000,
      newZoom: 0.2,
      viewportWidth: 800,
      anchorTime: 20_000,
      anchorX: 400,
    });
    expect(viewport.scrollX).toBe(3_600);
    expect(20_000 * viewport.zoom - viewport.scrollX).toBe(400);
  });
});

describe('timeline playhead follow', () => {
  it('scrolls only when the playhead leaves the padded visible range', () => {
    expect(
      getScrollToKeepTimeVisible({
        time: 5_000,
        duration: 30_000,
        zoom: 0.2,
        scrollX: 500,
        viewportWidth: 800,
      }),
    ).toBe(500);

    expect(
      getScrollToKeepTimeVisible({
        time: 8_000,
        duration: 30_000,
        zoom: 0.2,
        scrollX: 500,
        viewportWidth: 800,
      }),
    ).toBe(824);
  });

  it('clamps follow scrolling at both duration boundaries', () => {
    expect(
      getScrollToKeepTimeVisible({
        time: 0,
        duration: 30_000,
        zoom: 0.2,
        scrollX: 1_000,
        viewportWidth: 800,
      }),
    ).toBe(0);

    expect(
      getScrollToKeepTimeVisible({
        time: 30_000,
        duration: 30_000,
        zoom: 0.2,
        scrollX: 1_000,
        viewportWidth: 800,
      }),
    ).toBe(5_200);
  });
});

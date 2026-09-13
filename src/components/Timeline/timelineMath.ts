export function timeToPixel(time: number, zoom: number): number {
  return time * zoom;
}

export function pixelToTime(pixel: number, zoom: number): number {
  return pixel / zoom;
}

export function clampTimelineZoom(zoom: number, minZoom: number, maxZoom: number): number {
  return Math.min(maxZoom, Math.max(minZoom, zoom));
}

export function getTimelineMaxScroll(
  duration: number,
  zoom: number,
  viewportWidth: number,
): number {
  return Math.max(0, timeToPixel(duration, zoom) - Math.max(0, viewportWidth));
}

export function clampTimelineScroll(
  scrollX: number,
  duration: number,
  zoom: number,
  viewportWidth: number,
): number {
  return Math.min(getTimelineMaxScroll(duration, zoom, viewportWidth), Math.max(0, scrollX));
}

export function getZoomedTimelineViewport(params: {
  duration: number;
  oldZoom: number;
  newZoom: number;
  scrollX: number;
  viewportWidth: number;
  anchorX: number;
}): { zoom: number; scrollX: number } {
  const { duration, oldZoom, newZoom, scrollX, viewportWidth, anchorX } = params;
  const safeOldZoom = Math.max(Number.EPSILON, oldZoom);
  const clampedAnchorX = Math.min(Math.max(0, viewportWidth), Math.max(0, anchorX));
  const anchorTime = pixelToTime(scrollX + clampedAnchorX, safeOldZoom);

  return getTimelineViewportAtTime({
    duration,
    newZoom,
    viewportWidth,
    anchorTime,
    anchorX: clampedAnchorX,
  });
}

export function getTimelineViewportAtTime(params: {
  duration: number;
  newZoom: number;
  viewportWidth: number;
  anchorTime: number;
  anchorX: number;
}): { zoom: number; scrollX: number } {
  const { duration, newZoom, viewportWidth, anchorTime, anchorX } = params;
  const clampedAnchorX = Math.min(Math.max(0, viewportWidth), Math.max(0, anchorX));
  const nextScrollX = timeToPixel(anchorTime, newZoom) - clampedAnchorX;

  return {
    zoom: newZoom,
    scrollX: clampTimelineScroll(nextScrollX, duration, newZoom, viewportWidth),
  };
}

export function getPlayheadZoomAnchorX(
  currentTime: number,
  zoom: number,
  scrollX: number,
  viewportWidth: number,
): number {
  const playheadX = timeToPixel(currentTime, zoom) - scrollX;
  if (playheadX >= 0 && playheadX <= viewportWidth) return playheadX;
  return viewportWidth / 2;
}

export function getScrollToKeepTimeVisible(params: {
  time: number;
  duration: number;
  zoom: number;
  scrollX: number;
  viewportWidth: number;
  padding?: number;
}): number {
  const { time, duration, zoom, scrollX, viewportWidth, padding = 24 } = params;
  if (viewportWidth <= 0) return 0;

  const effectivePadding = Math.min(Math.max(0, padding), viewportWidth / 2);
  const timeX = timeToPixel(Math.min(duration, Math.max(0, time)), zoom);
  let nextScrollX = scrollX;

  if (timeX < scrollX + effectivePadding) {
    nextScrollX = timeX - effectivePadding;
  } else if (timeX > scrollX + viewportWidth - effectivePadding) {
    nextScrollX = timeX - viewportWidth + effectivePadding;
  }

  return clampTimelineScroll(nextScrollX, duration, zoom, viewportWidth);
}

export function computeTicks(
  duration: number,
  zoom: number,
  scrollX: number,
  width: number,
): { time: number; x: number; label: string }[] {
  const intervals = [50, 100, 200, 500, 1000, 2000, 5000, 10000];
  const minTickSpacing = 60;
  let tickInterval = intervals[0];
  for (const interval of intervals) {
    if (interval * zoom >= minTickSpacing) {
      tickInterval = interval;
      break;
    }
  }

  const startTime = Math.floor(pixelToTime(scrollX, zoom) / tickInterval) * tickInterval;
  const endTime = Math.min(duration, pixelToTime(scrollX + width, zoom));
  const ticks: { time: number; x: number; label: string }[] = [];

  for (let time = startTime; time <= endTime + tickInterval; time += tickInterval) {
    if (time < 0) continue;
    const x = timeToPixel(time, zoom) - scrollX;
    const secs = time / 1000;
    const label =
      secs >= 60
        ? `${Math.floor(secs / 60)}:${(secs % 60).toFixed(secs % 1 === 0 ? 0 : 1).padStart(secs % 60 < 10 ? 3 : 4, '0')}`
        : `${secs.toFixed(secs % 1 === 0 ? 0 : 1)}s`;
    ticks.push({ time, x, label });
  }

  return ticks;
}

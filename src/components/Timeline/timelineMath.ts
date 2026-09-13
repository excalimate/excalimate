import { frameDurationMs } from './timelineTime';

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

export interface TimelineTick {
  frame: number;
  time: number;
  x: number;
  label?: string;
  major: boolean;
}

function frameStepCandidates(fps: number): number[] {
  const roundedFps = Math.max(1, Math.round(fps));
  const candidates = new Set([1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 24, 25, 30]);

  for (let divisor = 1; divisor <= roundedFps; divisor += 1) {
    if (roundedFps % divisor === 0) candidates.add(divisor);
  }
  for (const seconds of [1, 2, 5, 10, 15, 30, 60, 120, 300, 600]) {
    candidates.add(Math.max(1, Math.round(fps * seconds)));
  }

  return [...candidates].sort((left, right) => left - right);
}

function chooseFrameStep(fps: number, frameWidth: number, minSpacing: number): number {
  const requiredFrames = minSpacing / frameWidth;
  const candidates = frameStepCandidates(fps);
  return (
    candidates.find((candidate) => candidate >= requiredFrames) ??
    Math.ceil(requiredFrames / candidates[candidates.length - 1]) *
      candidates[candidates.length - 1]
  );
}

function formatTickLabel(time: number): string {
  const totalSeconds = time / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds - minutes * 60;
  const precision = Math.abs(seconds - Math.round(seconds)) < 0.0005 ? 0 : 3;
  const fixedSeconds = seconds.toFixed(precision);
  let secondsLabel = precision > 0 ? fixedSeconds.replace(/\.?0+$/, '') : fixedSeconds;
  if (minutes > 0 && seconds < 10) secondsLabel = `0${secondsLabel}`;

  return minutes > 0 ? `${minutes}:${secondsLabel}` : `${secondsLabel}s`;
}

export function computeTicks(
  duration: number,
  fps: number,
  zoom: number,
  scrollX: number,
  width: number,
): TimelineTick[] {
  const frameWidth = frameDurationMs(fps) * zoom;
  const minorStep = chooseFrameStep(fps, frameWidth, 8);
  const majorStep = chooseFrameStep(fps, frameWidth, 60);
  const startTime = Math.max(0, pixelToTime(scrollX, zoom));
  const endTime = Math.min(duration, pixelToTime(scrollX + width, zoom));
  const startFrame = Math.max(0, Math.floor((startTime * fps) / 1000));
  const endFrame = Math.max(startFrame, Math.ceil((endTime * fps) / 1000));
  const ticks = new Map<number, TimelineTick>();

  const addTicks = (step: number, major: boolean) => {
    const firstFrame = Math.floor(startFrame / step) * step;
    for (let frame = firstFrame; frame <= endFrame + step; frame += step) {
      const time = (frame * 1000) / fps;
      if (time < 0 || time > duration) continue;
      ticks.set(frame, {
        frame,
        time,
        x: timeToPixel(time, zoom) - scrollX,
        label: major ? formatTickLabel(time) : undefined,
        major,
      });
    }
  };

  addTicks(minorStep, false);
  addTicks(majorStep, true);
  return [...ticks.values()].sort((left, right) => left.frame - right.frame);
}

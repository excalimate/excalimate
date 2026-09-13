import { frameDurationMs } from './timelineTime';

export function timeToPixel(time: number, zoom: number): number {
  return time * zoom;
}

export function pixelToTime(pixel: number, zoom: number): number {
  return pixel / zoom;
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
  return candidates.find((candidate) => candidate >= requiredFrames)
    ?? Math.ceil(requiredFrames / candidates[candidates.length - 1]) * candidates[candidates.length - 1];
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

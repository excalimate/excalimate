import { clamp, parseTime } from '../../core/utils/math';

const DEFAULT_FPS = 60;

function usableFps(fps: number): number {
  return Number.isFinite(fps) && fps > 0 ? fps : DEFAULT_FPS;
}

export function frameDurationMs(fps: number): number {
  return 1000 / usableFps(fps);
}

export function snapTimeToFrame(
  time: number,
  fps: number,
  min = 0,
  max = Number.POSITIVE_INFINITY,
): number {
  const boundedTime = clamp(Number.isFinite(time) ? time : min, min, max);
  const frame = Math.round((boundedTime * usableFps(fps)) / 1000);
  return clamp((frame * 1000) / usableFps(fps), min, max);
}

export function stepTimeByFrames(
  time: number,
  frameDelta: number,
  fps: number,
  duration: number,
): number {
  const currentFrame = Math.round((clamp(time, 0, duration) * usableFps(fps)) / 1000);
  const nextFrame = currentFrame + frameDelta;
  return clamp((nextFrame * 1000) / usableFps(fps), 0, duration);
}

export type TimelineTimeEntryResult =
  | { ok: true; time: number; clamped: boolean }
  | { ok: false; error: string };

export function parseTimelineTimeEntry(
  input: string,
  duration: number,
  fps: number,
): TimelineTimeEntryResult {
  const parsed = parseTime(input);
  if (parsed === null || !Number.isFinite(parsed)) {
    return {
      ok: false,
      error: 'Enter seconds, milliseconds (for example 1250ms), or m:ss.mmm.',
    };
  }

  const clampedTime = clamp(parsed, 0, duration);
  const time =
    clampedTime === 0 || clampedTime === duration
      ? clampedTime
      : snapTimeToFrame(clampedTime, fps, 0, duration);

  return {
    ok: true,
    time,
    clamped: clampedTime !== parsed,
  };
}

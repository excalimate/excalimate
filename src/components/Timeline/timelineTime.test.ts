import { describe, expect, it } from 'vitest';
import {
  frameDurationMs,
  parseTimelineTimeEntry,
  snapKeyframeDragDelta,
  snapTimeToFrame,
  stepTimeByFrames,
} from './timelineTime';

describe('timeline frame timing', () => {
  it('snaps edit times to frames derived from project FPS', () => {
    expect(frameDurationMs(60)).toBeCloseTo(16.6666667);
    expect(snapTimeToFrame(20, 60)).toBeCloseTo(16.6666667);
    expect(snapTimeToFrame(100, 24)).toBeCloseTo(83.3333333);
  });

  it('clamps snapped edits and frame stepping to timeline boundaries', () => {
    expect(snapTimeToFrame(-25, 30, 0, 5000)).toBe(0);
    expect(snapTimeToFrame(5100, 30, 0, 5000)).toBe(5000);
    expect(stepTimeByFrames(0, -1, 24, 5000)).toBe(0);
    expect(stepTimeByFrames(4990, 1, 24, 5000)).toBe(5000);
  });

  it('snaps a group drag by its anchor while preserving relative offsets', () => {
    const delta = snapKeyframeDragDelta(100, 20, 60, 5000);

    expect(100 + delta).toBeCloseTo(116.6666667);
    expect(275 + delta).toBeCloseTo(291.6666667);
  });
});

describe('timeline time entry', () => {
  it.each([
    ['1.25', 1250],
    ['1250ms', 1250],
    ['1:02.500', 62_500],
  ])('parses %s and snaps it to the nearest frame', (input, expected) => {
    expect(parseTimelineTimeEntry(input, 120_000, 60)).toEqual({
      ok: true,
      time: expected,
      clamped: false,
    });
  });

  it('clamps out-of-range entries while preserving the exact end boundary', () => {
    expect(parseTimelineTimeEntry('-2', 5123, 60)).toEqual({
      ok: true,
      time: 0,
      clamped: true,
    });
    expect(parseTimelineTimeEntry('99', 5123, 60)).toEqual({
      ok: true,
      time: 5123,
      clamped: true,
    });
  });

  it('rejects invalid entries with a validation message', () => {
    expect(parseTimelineTimeEntry('not a time', 5000, 60)).toEqual({
      ok: false,
      error: 'Enter seconds, milliseconds (for example 1250ms), or m:ss.mmm.',
    });
  });
});

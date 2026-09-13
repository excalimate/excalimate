import { describe, expect, it } from 'vitest';
import type { AnimationTrack } from '../../types/animation';
import {
  findAdjacentTimelineTarget,
  getFrameShortcutNavigation,
  getRelevantTimelineTargets,
  moveTimeByFrames,
} from './timelineNavigation';

function track(id: string, targetId: string, times: number[]): AnimationTrack {
  return {
    id,
    targetId,
    targetType: 'element',
    property: 'opacity',
    enabled: true,
    keyframes: times.map((time, index) => ({
      id: `${id}-${index}`,
      time,
      value: index,
      easing: 'linear',
    })),
  };
}

describe('timeline frame navigation', () => {
  it('maps PageUp and PageDown to AE-consistent directions and frame counts', () => {
    expect(getFrameShortcutNavigation('PageUp')).toEqual({
      direction: 'previous',
      frameCount: 1,
    });
    expect(getFrameShortcutNavigation('PageDown')).toEqual({
      direction: 'next',
      frameCount: 1,
    });
    expect(getFrameShortcutNavigation('shift+PageUp')).toEqual({
      direction: 'previous',
      frameCount: 10,
    });
    expect(getFrameShortcutNavigation('shift+PageDown')).toEqual({
      direction: 'next',
      frameCount: 10,
    });
  });

  it('moves by the requested frame count at the timeline frame rate', () => {
    const previous = getFrameShortcutNavigation('shift+PageUp');
    const next = getFrameShortcutNavigation('shift+PageDown');
    expect(
      moveTimeByFrames({
        currentTime: 1_000,
        duration: 5_000,
        fps: 25,
        ...previous,
      }),
    ).toBe(600);
    expect(
      moveTimeByFrames({
        currentTime: 1_000,
        duration: 5_000,
        fps: 25,
        ...next,
      }),
    ).toBe(1_400);
  });

  it('clamps frame navigation to the composition duration', () => {
    expect(
      moveTimeByFrames({
        currentTime: 20,
        duration: 5_000,
        fps: 25,
        frameCount: 10,
        direction: 'previous',
      }),
    ).toBe(0);
    expect(
      moveTimeByFrames({
        currentTime: 4_900,
        duration: 5_000,
        fps: 25,
        frameCount: 10,
        direction: 'next',
      }),
    ).toBe(5_000);
  });
});

describe('timeline keyframe navigation', () => {
  const tracks = [
    track('track-a', 'layer-a', [500, 1_500]),
    track('track-b', 'layer-b', [750, 2_000]),
  ];

  it('uses all layers when there is no explicit layer selection', () => {
    expect(
      getRelevantTimelineTargets({
        tracks,
        selectedTargetIds: [],
        clipStart: 100,
        clipEnd: 2_500,
        duration: 3_000,
      }),
    ).toEqual([100, 500, 750, 1_500, 2_000, 2_500]);
  });

  it('uses only explicitly selected layers while retaining work-area boundaries', () => {
    expect(
      getRelevantTimelineTargets({
        tracks,
        selectedTargetIds: ['layer-b'],
        clipStart: 100,
        clipEnd: 2_500,
        duration: 3_000,
      }),
    ).toEqual([100, 750, 2_000, 2_500]);
  });

  it('finds strict previous and next targets without skipping nearby boundaries', () => {
    const targets = [100, 500, 750, 1_500];
    expect(findAdjacentTimelineTarget(targets, 750, 'previous')).toBe(500);
    expect(findAdjacentTimelineTarget(targets, 750, 'next')).toBe(1_500);
    expect(findAdjacentTimelineTarget(targets, 100, 'previous')).toBe(100);
    expect(findAdjacentTimelineTarget(targets, 1_500, 'next')).toBe(1_500);
  });
});

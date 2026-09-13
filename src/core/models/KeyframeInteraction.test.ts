// @vitest-environment node
import { describe, expect, it } from 'vitest';
import type { AnimationTrack, Keyframe } from '../../types/animation';
import {
  calculateKeyframeGroupMove,
  getCurrentTimeKeyframeIds,
  resolveKeyframeSelection,
} from './KeyframeInteraction';

function keyframe(id: string, time: number): Keyframe {
  return { id, time, value: 0, easing: 'linear' };
}

function track(id: string, targetId: string, keyframes: Keyframe[]): AnimationTrack {
  return {
    id,
    targetId,
    targetType: 'element',
    property: 'opacity',
    keyframes,
    enabled: true,
  };
}

describe('calculateKeyframeGroupMove', () => {
  it('moves selected keyframes together while preserving relative offsets', () => {
    const tracks = [
      track('track-a', 'element-a', [keyframe('a', 100), keyframe('b', 300)]),
      track('track-b', 'element-b', [keyframe('c', 500)]),
    ];

    const movement = calculateKeyframeGroupMove(tracks, ['a', 'b', 'c'], 250, 1000);

    expect(movement.delta).toBe(250);
    expect(movement.moves.map(({ keyframeId, time }) => [keyframeId, time])).toEqual([
      ['a', 350],
      ['b', 550],
      ['c', 750],
    ]);
  });

  it('clamps the whole group to both timeline boundaries', () => {
    const tracks = [
      track('track-a', 'element-a', [keyframe('a', 100), keyframe('b', 900)]),
    ];

    const moveRight = calculateKeyframeGroupMove(tracks, ['a', 'b'], 500, 1000);
    const moveLeft = calculateKeyframeGroupMove(tracks, ['a', 'b'], -500, 1000);

    expect(moveRight.delta).toBe(100);
    expect(moveRight.moves.map(({ time }) => time)).toEqual([200, 1000]);
    expect(moveLeft.delta).toBe(-100);
    expect(moveLeft.moves.map(({ time }) => time)).toEqual([0, 800]);
  });

  it('stops before an unselected keyframe without collisions or data loss', () => {
    const tracks = [
      track('track-a', 'element-a', [
        keyframe('a', 100),
        keyframe('b', 200),
        keyframe('fixed', 350),
      ]),
    ];

    const movement = calculateKeyframeGroupMove(tracks, ['a', 'b'], 150, 1000);

    expect(movement.delta).toBe(149);
    expect(movement.moves.map(({ time }) => time)).toEqual([249, 349]);
    expect(tracks[0].keyframes).toHaveLength(3);
    expect(tracks[0].keyframes.map(({ time }) => time)).toEqual([100, 200, 350]);
  });
});

describe('keyframe selection', () => {
  it('replaces selection on a plain click', () => {
    expect(resolveKeyframeSelection(['a', 'b'], 'c', false)).toEqual(['c']);
  });

  it('adds and toggles keyframes with a selection modifier', () => {
    expect(resolveKeyframeSelection(['a', 'b'], 'c', true)).toEqual(['a', 'b', 'c']);
    expect(resolveKeyframeSelection(['a', 'b'], 'b', true)).toEqual(['a']);
  });

  it('keeps current-time highlights separate from explicit movement selection', () => {
    const tracks = [
      track('track-a', 'element-a', [
        keyframe('explicit', 100),
        keyframe('current-time', 300),
      ]),
    ];

    expect(getCurrentTimeKeyframeIds(tracks, ['element-a'], 300)).toEqual(['current-time']);

    const movement = calculateKeyframeGroupMove(tracks, ['explicit'], 100, 1000);
    expect(movement.moves).toEqual([
      { trackId: 'track-a', keyframeId: 'explicit', time: 200 },
    ]);
  });
});

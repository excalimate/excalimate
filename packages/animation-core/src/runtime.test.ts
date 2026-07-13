import { describe, expect, it } from 'vitest';
import type {
  AnimationTimeline,
  AnimationTrack,
} from '@excalimate/project-schema';
import {
  AnimationEngine,
  compileTimeline,
  computeCompiledFrame,
} from './runtime.js';

function track(
  id: string,
  targetId: string,
  property: AnimationTrack['property'],
  keyframes: AnimationTrack['keyframes'],
  targetType: AnimationTrack['targetType'] = 'element',
): AnimationTrack {
  return {
    id,
    targetId,
    targetType,
    property,
    keyframes,
    enabled: true,
  };
}

function timeline(tracks: AnimationTrack[]): AnimationTimeline {
  return {
    id: 'timeline',
    name: 'Test',
    duration: 5000,
    fps: 60,
    tracks,
  };
}

describe('compiled playback runtime', () => {
  it('sorts once and binary-searches precomputed segments', () => {
    const compiled = compileTimeline(
      timeline([
        track('opacity', 'element', 'opacity', [
          { id: 'end', time: 1000, value: 1, easing: 'linear' },
          { id: 'start', time: 0, value: 0, easing: 'linear' },
        ]),
      ]),
      4,
    );
    const compiledTrack = compiled.tracksByTarget
      .get('element')
      ?.get('opacity');
    expect(compiledTrack?.keyframes.map((keyframe) => keyframe.id)).toEqual([
      'start',
      'end',
    ]);
    expect(compiledTrack?.segments).toHaveLength(1);
    expect(computeCompiledFrame(compiled, 500).get('element')?.opacity)
      .toBeCloseTo(0.5);
  });

  it('composes multiple tracks for the same target property chronologically', () => {
    const compiled = compileTimeline(
      timeline([
        {
          ...track('fade-in', 'element', 'opacity', [
            { id: 'fade-in-start', time: 0, value: 0, easing: 'linear' },
            { id: 'fade-in-end', time: 500, value: 1, easing: 'linear' },
          ]),
          managedActionId: 'action-1',
        },
        {
          ...track('fade-out', 'element', 'opacity', [
            { id: 'fade-out-start', time: 1000, value: 1, easing: 'linear' },
            { id: 'fade-out-end', time: 1500, value: 0, easing: 'linear' },
          ]),
          managedActionId: 'action-2',
        },
      ]),
    );

    expect(
      compiled.tracksByTarget
        .get('element')
        ?.get('opacity')
        ?.keyframes.map((keyframe) => keyframe.id),
    ).toEqual([
      'fade-in-start',
      'fade-in-end',
      '!hold_fade-out',
      'fade-out-start',
      'fade-out-end',
    ]);
    expect(computeCompiledFrame(compiled, 750).get('element')?.opacity).toBe(1);
    expect(computeCompiledFrame(compiled, 1250).get('element')?.opacity)
      .toBeCloseTo(0.5);
  });

  it('invalidates a same-time frame after a timeline revision changes', () => {
    const engine = new AnimationEngine();
    const firstTimeline = timeline([
      track('opacity', 'element', 'opacity', [
        { id: 'start', time: 0, value: 0, easing: 'linear' },
        { id: 'end', time: 1000, value: 1, easing: 'linear' },
      ]),
    ]);
    const first = engine.computeFrame(firstTimeline, 500, {}, {
      timelineRevision: 1,
      hierarchyRevision: 0,
    });
    const secondTimeline: AnimationTimeline = {
      ...firstTimeline,
      tracks: firstTimeline.tracks.map((value) => ({
        ...value,
        keyframes: value.keyframes.map((keyframe) =>
          keyframe.id === 'end' ? { ...keyframe, value: 0.5 } : keyframe,
        ),
      })),
    };
    const second = engine.computeFrame(secondTimeline, 500, {}, {
      timelineRevision: 2,
      hierarchyRevision: 0,
    });
    expect(first).not.toBe(second);
    expect(second.get('element')?.opacity).toBeCloseTo(0.25);
  });

  it('composes nested groups in deterministic hierarchy order', () => {
    const compiled = compileTimeline(
      timeline([
        track(
          'outer-x',
          'outer',
          'translateX',
          [{ id: 'o', time: 0, value: 100, easing: 'linear' }],
          'group',
        ),
        track(
          'inner-x',
          'inner',
          'translateX',
          [{ id: 'i', time: 0, value: 50, easing: 'linear' }],
          'group',
        ),
        track('element-x', 'element', 'translateX', [
          { id: 'e', time: 0, value: 25, easing: 'linear' },
        ]),
      ]),
    );
    const frame = computeCompiledFrame(
      compiled,
      0,
      { outer: ['inner'], inner: ['element'] },
      ['outer', 'inner'],
    );
    expect(frame.get('element')?.translateX).toBe(175);
  });

  it('preserves last-enabled-track precedence for compatibility', () => {
    const compiled = compileTimeline(
      timeline([
        track('first', 'element', 'opacity', [
          { id: 'first-value', time: 0, value: 0.25, easing: 'linear' },
        ]),
        track('second', 'element', 'opacity', [
          { id: 'second-value', time: 0, value: 0.75, easing: 'linear' },
        ]),
      ]),
    );
    expect(computeCompiledFrame(compiled, 0).get('element')?.opacity).toBe(0.75);
  });
});

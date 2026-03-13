import { describe, it, expect, beforeEach } from 'vitest';
import { AnimationEngine, composeStates, createDefaultState } from './AnimationEngine';
import type { AnimationTimeline, AnimationTrack, Keyframe } from '../../types/animation';
import { PROPERTY_DEFAULTS } from '../../types/animation';

function kf(time: number, value: number, easing: Keyframe['easing'] = 'linear'): Keyframe {
  return { id: `kf-${time}-${value}`, time, value, easing };
}

function track(
  targetId: string,
  property: AnimationTrack['property'],
  keyframes: Keyframe[],
  targetType: 'element' | 'group' = 'element',
): AnimationTrack {
  return {
    id: `track-${targetId}-${property}`,
    targetId,
    targetType,
    property,
    keyframes,
    enabled: true,
  };
}

function timeline(tracks: AnimationTrack[], duration = 5000): AnimationTimeline {
  return { id: 'timeline-1', name: 'Test', duration, fps: 60, tracks };
}

describe('AnimationEngine', () => {
  let engine: AnimationEngine;

  beforeEach(() => {
    engine = new AnimationEngine();
  });

  describe('computeFrame', () => {
    it('returns empty FrameState for empty timeline', () => {
      const tl = timeline([]);
      const frame = engine.computeFrame(tl, 0);
      expect(frame.size).toBe(0);
    });

    it('computes single track opacity animation', () => {
      const tl = timeline([track('elem1', 'opacity', [kf(0, 0), kf(1000, 1)])]);
      const frame = engine.computeFrame(tl, 500);
      const state = frame.get('elem1')!;
      expect(state).toBeDefined();
      expect(state.opacity).toBeCloseTo(0.5);
      expect(state.translateX).toBe(PROPERTY_DEFAULTS.translateX);
      expect(state.scaleX).toBe(PROPERTY_DEFAULTS.scaleX);
    });

    it('computes multiple tracks for same target', () => {
      const tl = timeline([
        track('elem1', 'opacity', [kf(0, 0), kf(1000, 1)]),
        track('elem1', 'translateX', [kf(0, 0), kf(1000, 200)]),
        track('elem1', 'rotation', [kf(0, 0), kf(1000, 360)]),
      ]);
      const frame = engine.computeFrame(tl, 500);
      const state = frame.get('elem1')!;
      expect(state.opacity).toBeCloseTo(0.5);
      expect(state.translateX).toBeCloseTo(100);
      expect(state.rotation).toBeCloseTo(180);
    });

    it('computes multiple targets independently', () => {
      const tl = timeline([
        track('elem1', 'opacity', [kf(0, 0), kf(1000, 1)]),
        track('elem2', 'translateX', [kf(0, 100), kf(1000, -100)]),
      ]);
      const frame = engine.computeFrame(tl, 500);
      expect(frame.get('elem1')!.opacity).toBeCloseTo(0.5);
      expect(frame.get('elem2')!.translateX).toBeCloseTo(0);
    });

    it('skips disabled tracks', () => {
      const disabledTrack: AnimationTrack = {
        ...track('elem1', 'opacity', [kf(0, 0), kf(1000, 1)]),
        enabled: false,
      };
      const tl = timeline([disabledTrack]);
      const frame = engine.computeFrame(tl, 500);
      expect(frame.size).toBe(0);
    });

    it('memoizes frame state for same time', () => {
      const tl = timeline([track('elem1', 'opacity', [kf(0, 0), kf(1000, 1)])]);
      const frame1 = engine.computeFrame(tl, 500);
      const frame2 = engine.computeFrame(tl, 500);
      expect(frame1).toBe(frame2); // Same reference
    });

    it('recomputes for different time', () => {
      const tl = timeline([track('elem1', 'opacity', [kf(0, 0), kf(1000, 1)])]);
      const frame1 = engine.computeFrame(tl, 500);
      const frame2 = engine.computeFrame(tl, 700);
      expect(frame1).not.toBe(frame2);
      expect(frame2.get('elem1')!.opacity).toBeCloseTo(0.7);
    });

    it('invalidateCache forces recomputation', () => {
      const tl = timeline([track('elem1', 'opacity', [kf(0, 0), kf(1000, 1)])]);
      const frame1 = engine.computeFrame(tl, 500);
      engine.invalidateCache();
      const frame2 = engine.computeFrame(tl, 500);
      expect(frame1).not.toBe(frame2);
    });
  });

  describe('group hierarchy', () => {
    it('cascades group transforms to children', () => {
      const tl = timeline([
        track('group1', 'translateX', [kf(0, 0), kf(1000, 100)], 'group'),
        track('elem1', 'translateX', [kf(0, 0), kf(1000, 50)]),
      ]);
      const hierarchy = { group1: ['elem1'] };
      const frame = engine.computeFrame(tl, 500, hierarchy);

      const elem1State = frame.get('elem1')!;
      // group translateX = 50, elem translateX = 25
      // composed = 50 + 25 * 1 (group scaleX default=1) = 75
      expect(elem1State.translateX).toBeCloseTo(75);
    });

    it('cascades group opacity by multiplication', () => {
      const tl = timeline([
        track('group1', 'opacity', [kf(0, 1), kf(1000, 0.5)], 'group'),
        track('elem1', 'opacity', [kf(0, 1), kf(1000, 0.5)]),
      ]);
      const hierarchy = { group1: ['elem1'] };
      const frame = engine.computeFrame(tl, 1000, hierarchy);

      const elem1State = frame.get('elem1')!;
      // group opacity = 0.5, elem opacity = 0.5
      // composed = 0.5 * 0.5 = 0.25
      expect(elem1State.opacity).toBeCloseTo(0.25);
    });

    it('cascades group scale by multiplication', () => {
      const tl = timeline([
        track('group1', 'scaleX', [kf(0, 1), kf(1000, 2)], 'group'),
        track('elem1', 'scaleX', [kf(0, 1), kf(1000, 3)]),
      ]);
      const hierarchy = { group1: ['elem1'] };
      const frame = engine.computeFrame(tl, 1000, hierarchy);

      expect(frame.get('elem1')!.scaleX).toBeCloseTo(6);
    });

    it('cascades group rotation by addition', () => {
      const tl = timeline([
        track('group1', 'rotation', [kf(0, 0), kf(1000, 90)], 'group'),
        track('elem1', 'rotation', [kf(0, 0), kf(1000, 45)]),
      ]);
      const hierarchy = { group1: ['elem1'] };
      const frame = engine.computeFrame(tl, 1000, hierarchy);

      expect(frame.get('elem1')!.rotation).toBeCloseTo(135);
    });

    it('handles elements without animation in groups', () => {
      const tl = timeline([
        track('group1', 'translateX', [kf(0, 0), kf(1000, 100)], 'group'),
      ]);
      const hierarchy = { group1: ['elem1', 'elem2'] };
      const frame = engine.computeFrame(tl, 1000, hierarchy);

      // elem1 and elem2 should get group's translate even without their own tracks
      expect(frame.get('elem1')!.translateX).toBeCloseTo(100);
      expect(frame.get('elem2')!.translateX).toBeCloseTo(100);
    });
  });

  describe('static methods', () => {
    it('getAnimatedTargets returns all unique target IDs', () => {
      const tl = timeline([
        track('elem1', 'opacity', []),
        track('elem2', 'translateX', []),
        track('elem1', 'rotation', []),
      ]);
      const targets = AnimationEngine.getAnimatedTargets(tl);
      expect(targets.size).toBe(2);
      expect(targets.has('elem1')).toBe(true);
      expect(targets.has('elem2')).toBe(true);
    });

    it('getEffectiveDuration returns max of declared and keyframe durations', () => {
      const tl = timeline(
        [track('elem1', 'opacity', [kf(0, 0), kf(3000, 1)])],
        2000,
      );
      expect(AnimationEngine.getEffectiveDuration(tl)).toBe(3000);
    });

    it('getEffectiveDuration respects declared duration if larger', () => {
      const tl = timeline(
        [track('elem1', 'opacity', [kf(0, 0), kf(1000, 1)])],
        5000,
      );
      expect(AnimationEngine.getEffectiveDuration(tl)).toBe(5000);
    });
  });
});

describe('createDefaultState', () => {
  it('returns all default values', () => {
    const state = createDefaultState('test');
    expect(state.targetId).toBe('test');
    expect(state.opacity).toBe(1);
    expect(state.translateX).toBe(0);
    expect(state.translateY).toBe(0);
    expect(state.scaleX).toBe(1);
    expect(state.scaleY).toBe(1);
    expect(state.rotation).toBe(0);
  });
});

describe('composeStates', () => {
  it('composes identity group with element', () => {
    const group = createDefaultState('group');
    const element = createDefaultState('elem');
    element.translateX = 50;
    element.opacity = 0.5;

    const result = composeStates(group, element);
    expect(result.targetId).toBe('elem');
    expect(result.translateX).toBe(50);
    expect(result.opacity).toBe(0.5);
  });

  it('scales element translation by group scale', () => {
    const group = createDefaultState('group');
    group.scaleX = 2;
    const element = createDefaultState('elem');
    element.translateX = 50;

    const result = composeStates(group, element);
    expect(result.translateX).toBe(100); // 0 + 50 * 2
  });
});

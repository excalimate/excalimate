import { describe, it, expect } from 'vitest';
import { AnimationEngine } from './AnimationEngine';
import { createTimeline, addTrackToTimeline } from '../models/Timeline';
import { createTrack, addKeyframeToTrack } from '../models/Track';
import { createKeyframe } from '../models/Keyframe';

describe('Animation Pipeline Integration', () => {
  it('full pipeline: create → animate → verify', () => {
    // 1. Create a timeline
    let timeline = createTimeline('Test', 3000, 60);

    // 2. Add opacity track with keyframes
    let opacityTrack = createTrack('elem1', 'element', 'opacity');
    opacityTrack = addKeyframeToTrack(opacityTrack, createKeyframe(0, 0, 'linear'));
    opacityTrack = addKeyframeToTrack(opacityTrack, createKeyframe(1000, 1, 'linear'));
    opacityTrack = addKeyframeToTrack(opacityTrack, createKeyframe(2000, 0.5, 'easeOutQuad'));
    timeline = addTrackToTimeline(timeline, opacityTrack);

    // 3. Add position track
    let posTrack = createTrack('elem1', 'element', 'translateX');
    posTrack = addKeyframeToTrack(posTrack, createKeyframe(0, 0));
    posTrack = addKeyframeToTrack(posTrack, createKeyframe(2000, 200));
    timeline = addTrackToTimeline(timeline, posTrack);

    // 4. Compute frames
    const engine = new AnimationEngine();

    const frame0 = engine.computeFrame(timeline, 0);
    expect(frame0.get('elem1')!.opacity).toBeCloseTo(0);
    expect(frame0.get('elem1')!.translateX).toBeCloseTo(0);

    const frame500 = engine.computeFrame(timeline, 500);
    expect(frame500.get('elem1')!.opacity).toBeCloseTo(0.5);
    expect(frame500.get('elem1')!.translateX).toBeCloseTo(50);

    const frame1000 = engine.computeFrame(timeline, 1000);
    expect(frame1000.get('elem1')!.opacity).toBeCloseTo(1);
    expect(frame1000.get('elem1')!.translateX).toBeCloseTo(100);

    const frame2000 = engine.computeFrame(timeline, 2000);
    expect(frame2000.get('elem1')!.opacity).toBeCloseTo(0.5);
    expect(frame2000.get('elem1')!.translateX).toBeCloseTo(200);
  });

  it('multi-element animation with different timings', () => {
    let timeline = createTimeline('Multi', 2000);

    // Element 1: fade in
    let t1 = createTrack('elem1', 'element', 'opacity');
    t1 = addKeyframeToTrack(t1, createKeyframe(0, 0));
    t1 = addKeyframeToTrack(t1, createKeyframe(1000, 1));
    timeline = addTrackToTimeline(timeline, t1);

    // Element 2: slide in (starts at 500ms)
    let t2 = createTrack('elem2', 'element', 'translateX');
    t2 = addKeyframeToTrack(t2, createKeyframe(500, -100));
    t2 = addKeyframeToTrack(t2, createKeyframe(1500, 0));
    timeline = addTrackToTimeline(timeline, t2);

    const engine = new AnimationEngine();

    // At t=0: elem1 invisible, elem2 not yet animated
    const f0 = engine.computeFrame(timeline, 0);
    expect(f0.get('elem1')!.opacity).toBe(0);
    expect(f0.get('elem2')!.translateX).toBe(-100); // clamped to first kf

    // At t=750: elem1 half visible, elem2 starting to move
    const f750 = engine.computeFrame(timeline, 750);
    expect(f750.get('elem1')!.opacity).toBeCloseTo(0.75);
    expect(f750.get('elem2')!.translateX).toBeCloseTo(-75);

    // At t=1500: elem1 fully visible, elem2 at target
    const f1500 = engine.computeFrame(timeline, 1500);
    expect(f1500.get('elem1')!.opacity).toBe(1); // clamped
    expect(f1500.get('elem2')!.translateX).toBeCloseTo(0);
  });

  it('group hierarchy cascading transforms', () => {
    let timeline = createTimeline('Group', 1000);

    // Group: rotate
    let groupTrack = createTrack('group1', 'group', 'rotation');
    groupTrack = addKeyframeToTrack(groupTrack, createKeyframe(0, 0));
    groupTrack = addKeyframeToTrack(groupTrack, createKeyframe(1000, 360));
    timeline = addTrackToTimeline(timeline, groupTrack);

    // Child: also scale
    let childTrack = createTrack('elem1', 'element', 'scaleX');
    childTrack = addKeyframeToTrack(childTrack, createKeyframe(0, 1));
    childTrack = addKeyframeToTrack(childTrack, createKeyframe(1000, 2));
    timeline = addTrackToTimeline(timeline, childTrack);

    const engine = new AnimationEngine();
    const hierarchy = { group1: ['elem1', 'elem2'] };

    const frame = engine.computeFrame(timeline, 500, hierarchy);

    // elem1: group rotation (180) + own scaleX (1.5)
    const e1 = frame.get('elem1')!;
    expect(e1.rotation).toBeCloseTo(180);
    expect(e1.scaleX).toBeCloseTo(1.5);

    // elem2: inherits group rotation, default scaleX
    const e2 = frame.get('elem2')!;
    expect(e2.rotation).toBeCloseTo(180);
    expect(e2.scaleX).toBe(1);
  });

  it('easing functions produce correct curve shapes', () => {
    let timeline = createTimeline('Easing', 1000);

    let track = createTrack('elem1', 'element', 'opacity');
    track = addKeyframeToTrack(track, createKeyframe(0, 0, 'easeInCubic'));
    track = addKeyframeToTrack(track, createKeyframe(1000, 1));
    timeline = addTrackToTimeline(timeline, track);

    const engine = new AnimationEngine();

    // easeInCubic should be slow at start, fast at end
    const f250 = engine.computeFrame(timeline, 250);
    const f500 = engine.computeFrame(timeline, 500);
    const f750 = engine.computeFrame(timeline, 750);

    // Values should be below linear (which would be 0.25, 0.5, 0.75)
    expect(f250.get('elem1')!.opacity).toBeLessThan(0.25);
    expect(f500.get('elem1')!.opacity).toBeLessThan(0.5);
    // But at 0.75, cubic ease-in is still below linear
    expect(f750.get('elem1')!.opacity).toBeLessThan(0.75);
  });

  it('disabled tracks are ignored', () => {
    let timeline = createTimeline('Disabled', 1000);

    let track = createTrack('elem1', 'element', 'opacity');
    track = addKeyframeToTrack(track, createKeyframe(0, 0));
    track = addKeyframeToTrack(track, createKeyframe(1000, 1));
    track = { ...track, enabled: false };
    timeline = addTrackToTimeline(timeline, track);

    const engine = new AnimationEngine();
    const frame = engine.computeFrame(timeline, 500);

    // No animated elements since track is disabled
    expect(frame.size).toBe(0);
  });

  it('handles all animatable properties simultaneously', () => {
    let timeline = createTimeline('All props', 1000);
    const properties = ['opacity', 'translateX', 'translateY', 'scaleX', 'scaleY', 'rotation'] as const;

    for (const prop of properties) {
      let track = createTrack('elem1', 'element', prop);
      track = addKeyframeToTrack(track, createKeyframe(0, 0));
      track = addKeyframeToTrack(track, createKeyframe(1000, prop === 'opacity' ? 1 : 100));
      timeline = addTrackToTimeline(timeline, track);
    }

    const engine = new AnimationEngine();
    const frame = engine.computeFrame(timeline, 500);
    const state = frame.get('elem1')!;

    expect(state.opacity).toBeCloseTo(0.5);
    expect(state.translateX).toBeCloseTo(50);
    expect(state.translateY).toBeCloseTo(50);
    expect(state.scaleX).toBeCloseTo(50);
    expect(state.scaleY).toBeCloseTo(50);
    expect(state.rotation).toBeCloseTo(50);
  });
});

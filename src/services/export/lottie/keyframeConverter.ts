/**
 * Convert Excalimate animation tracks to Lottie transform keyframes.
 */
import type {
  LottieTransform,
  LottieKeyframe,
  LottieSingleValue,
  LottieMultiValue,
  LottieTrimPath,
} from './types';
import { staticVal, staticMulti, animatedVal } from './types';
import { getEasing } from './easingMap';
import type { AnimationTrack, Keyframe } from '../../../types/animation';
import { interpolate } from '@excalimate/animation-core';
import { sampleEasingProgresses } from '@excalimate/export-runtime';

const ADAPTIVE_EASING_TOLERANCE = 0.0025;
const MAX_ADAPTIVE_SAMPLES_PER_SEGMENT = 24;

/** Convert time in milliseconds to Lottie frame number. */
function msToFrame(ms: number, fps: number, clipStart: number): number {
  return ((ms - clipStart) / 1000) * fps;
}

/** Convert a single Excalimate keyframe to Lottie format. */
function toLottieKeyframe(
  kf: Keyframe,
  fps: number,
  clipStart: number,
  valueTransform: (v: number) => number = (v) => v,
): LottieKeyframe {
  const easing = getEasing(kf.easing);
  return {
    t: msToFrame(kf.time, fps, clipStart),
    s: [valueTransform(kf.value)],
    i: easing.i,
    o: easing.o,
  };
}

/** Build Lottie keyframes for a single-value property (opacity, rotation). */
function buildSingleKeyframes(
  keyframes: Keyframe[],
  property: AnimationTrack['property'],
  fps: number,
  clipStart: number,
  clipEnd: number,
  valueTransform: (v: number) => number = (v) => v,
): LottieSingleValue {
  const clipped = clipKeyframes(keyframes, property, clipStart, clipEnd);
  if (clipped.length === 0) return staticVal(valueTransform(0));
  if (clipped.length === 1) return staticVal(valueTransform(clipped[0].value));
  return animatedVal(clipped.map((kf) => toLottieKeyframe(kf, fps, clipStart, valueTransform)));
}

export interface TracksByProperty {
  opacity: Keyframe[];
  translateX: Keyframe[];
  translateY: Keyframe[];
  scaleX: Keyframe[];
  scaleY: Keyframe[];
  rotation: Keyframe[];
  drawProgress: Keyframe[];
}

interface ScaleOriginCompensation {
  width: number;
  height: number;
}

/** Group tracks for a target by property. */
export function groupTracksByProperty(
  tracks: AnimationTrack[],
  targetId: string,
): TracksByProperty {
  const result: TracksByProperty = {
    opacity: [],
    translateX: [],
    translateY: [],
    scaleX: [],
    scaleY: [],
    rotation: [],
    drawProgress: [],
  };

  for (const track of tracks) {
    if (track.targetId !== targetId || !track.enabled) continue;
    if (track.property in result) {
      result[track.property as keyof TracksByProperty] = track.keyframes;
    }
  }

  return result;
}

/**
 * Build a Lottie transform from Excalimate tracks, relative to an element's base position.
 */
export function buildTransform(
  baseX: number,
  baseY: number,
  baseAngle: number,
  baseOpacity: number,
  props: TracksByProperty,
  fps: number,
  clipStart: number,
  clipEnd: number,
  scaleOriginCompensation?: ScaleOriginCompensation,
): LottieTransform {
  const clippedProps = clipProperties(props, clipStart, clipEnd);
  // Position: base + translateX/Y keyframes
  const includeScaleOriginCompensation = Boolean(scaleOriginCompensation);
  const positionAnimated =
    clippedProps.translateX.length > 0 ||
    clippedProps.translateY.length > 0 ||
    (includeScaleOriginCompensation &&
      (clippedProps.scaleX.length > 0 || clippedProps.scaleY.length > 0));
  let p: LottieMultiValue;

  if (positionAnimated) {
    // Merge translateX and translateY into position keyframes
    // Collect all unique times
    const times = new Set<number>();
    for (const kf of clippedProps.translateX) times.add(kf.time);
    for (const kf of clippedProps.translateY) times.add(kf.time);
    if (includeScaleOriginCompensation) {
      for (const kf of clippedProps.scaleX) times.add(kf.time);
      for (const kf of clippedProps.scaleY) times.add(kf.time);
    }
    const sortedTimes = [...times].sort((a, b) => a - b);

    const keyframes: LottieKeyframe[] = sortedTimes.map((t) => {
      const currentTx = valueAt(clippedProps.translateX, t, 'translateX', 0);
      const currentTy = valueAt(clippedProps.translateY, t, 'translateY', 0);
      const currentSx = valueAt(clippedProps.scaleX, t, 'scaleX', 1);
      const currentSy = valueAt(clippedProps.scaleY, t, 'scaleY', 1);

      let px = baseX + currentTx;
      let py = baseY + currentTy;
      if (scaleOriginCompensation) {
        // Runtime scaling is top-left-based; convert it to center-based Lottie layer space.
        px += ((currentSx - 1) * scaleOriginCompensation.width) / 2;
        py += ((currentSy - 1) * scaleOriginCompensation.height) / 2;
      }
      const easing = getEasing('linear');
      return {
        t: msToFrame(t, fps, clipStart),
        s: [px, py, 0],
        i: easing.i,
        o: easing.o,
      };
    });

    p = { a: 1, k: keyframes };
  } else {
    p = staticMulti([baseX, baseY, 0]);
  }

  // Scale: combine scaleX and scaleY
  const scaleAnimated = clippedProps.scaleX.length > 0 || clippedProps.scaleY.length > 0;
  let s: LottieMultiValue;

  if (scaleAnimated) {
    const times = new Set<number>();
    for (const kf of clippedProps.scaleX) times.add(kf.time);
    for (const kf of clippedProps.scaleY) times.add(kf.time);
    const sortedTimes = [...times].sort((a, b) => a - b);

    const keyframes: LottieKeyframe[] = sortedTimes.map((t) => {
      const sx = valueAt(clippedProps.scaleX, t, 'scaleX', 1) * 100;
      const sy = valueAt(clippedProps.scaleY, t, 'scaleY', 1) * 100;
      const easing = getEasing('linear');
      return {
        t: msToFrame(t, fps, clipStart),
        s: [sx, sy, 100],
        i: easing.i,
        o: easing.o,
      };
    });

    s = { a: 1, k: keyframes };
  } else {
    s = staticMulti([100, 100, 100]);
  }

  // Rotation: base angle + animated rotation
  const r =
    clippedProps.rotation.length > 0
      ? buildSingleKeyframes(
          clippedProps.rotation,
          'rotation',
          fps,
          clipStart,
          clipEnd,
          (v) => baseAngle + v,
        )
      : staticVal(baseAngle);

  // Opacity: Excalimate 0–1 → Lottie 0–100
  const o =
    clippedProps.opacity.length > 0
      ? buildSingleKeyframes(
          clippedProps.opacity,
          'opacity',
          fps,
          clipStart,
          clipEnd,
          (v) => baseOpacity * v,
        )
      : staticVal(baseOpacity);

  return {
    a: staticMulti([0, 0, 0]),
    p,
    s,
    r,
    o,
  };
}

/**
 * Build a Lottie TrimPath from drawProgress keyframes.
 * Returns null if no drawProgress animation exists.
 */
export function buildTrimPath(
  props: TracksByProperty,
  fps: number,
  clipStart: number,
  clipEnd: number,
): LottieTrimPath | null {
  const keyframes = clipKeyframes(props.drawProgress, 'drawProgress', clipStart, clipEnd);
  if (keyframes.length === 0) return null;

  return {
    ty: 'tm',
    nm: 'Trim',
    s: staticVal(0),
    e: buildSingleKeyframes(keyframes, 'drawProgress', fps, clipStart, clipEnd, (v) => v * 100),
    o: staticVal(0),
  };
}

function clipProperties(
  props: TracksByProperty,
  clipStart: number,
  clipEnd: number,
): TracksByProperty {
  return {
    opacity: clipKeyframes(props.opacity, 'opacity', clipStart, clipEnd),
    translateX: clipKeyframes(props.translateX, 'translateX', clipStart, clipEnd),
    translateY: clipKeyframes(props.translateY, 'translateY', clipStart, clipEnd),
    scaleX: clipKeyframes(props.scaleX, 'scaleX', clipStart, clipEnd),
    scaleY: clipKeyframes(props.scaleY, 'scaleY', clipStart, clipEnd),
    rotation: clipKeyframes(props.rotation, 'rotation', clipStart, clipEnd),
    drawProgress: clipKeyframes(props.drawProgress, 'drawProgress', clipStart, clipEnd),
  };
}

function clipKeyframes(
  keyframes: Keyframe[],
  property: AnimationTrack['property'],
  clipStart: number,
  clipEnd: number,
): Keyframe[] {
  if (keyframes.length === 0) return [];
  const sorted = [...keyframes].sort((left, right) => left.time - right.time);
  const times = new Set<number>([clipStart, clipEnd]);
  for (const keyframe of sorted) {
    if (keyframe.time > clipStart && keyframe.time < clipEnd) {
      times.add(keyframe.time);
    }
  }
  for (let index = 0; index < sorted.length - 1; index += 1) {
    const start = sorted[index];
    const end = sorted[index + 1];
    if (!start || !end || end.time <= clipStart || start.time >= clipEnd) continue;
    if (start.easing === 'linear') continue;
    if (start.easing === 'step') {
      if (end.time > clipStart && end.time <= clipEnd) {
        times.add(Math.max(clipStart, end.time - 0.001));
      }
      continue;
    }
    for (const progress of sampleEasingProgresses(
      start.easing,
      ADAPTIVE_EASING_TOLERANCE,
      MAX_ADAPTIVE_SAMPLES_PER_SEGMENT,
    )) {
      if (progress <= 0 || progress >= 1) continue;
      const time = start.time + (end.time - start.time) * progress;
      if (time > clipStart && time < clipEnd) times.add(time);
    }
  }

  return [...times]
    .sort((left, right) => left - right)
    .map((time, index) => ({
      id: `${property}-sample-${index}`,
      time,
      value: interpolate(sorted, time, property),
      easing: 'linear',
    }));
}

function valueAt(
  keyframes: Keyframe[],
  time: number,
  property: AnimationTrack['property'],
  fallback: number,
): number {
  return keyframes.length === 0 ? fallback : interpolate(keyframes, time, property);
}

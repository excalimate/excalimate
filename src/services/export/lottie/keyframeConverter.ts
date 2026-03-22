/**
 * Convert Excalimate animation tracks to Lottie transform keyframes.
 */
import type {
  LottieTransform, LottieKeyframe, LottieSingleValue, LottieMultiValue,
  LottieTrimPath,
} from './types';
import { staticVal, staticMulti, animatedVal } from './types';
import { getEasing } from './easingMap';
import type { AnimationTrack, Keyframe } from '../../../types/animation';

/** Convert time in milliseconds to Lottie frame number. */
function msToFrame(ms: number, fps: number, clipStart: number): number {
  return Math.round(((ms - clipStart) / 1000) * fps);
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
  fps: number,
  clipStart: number,
  valueTransform: (v: number) => number = (v) => v,
): LottieSingleValue {
  if (keyframes.length === 0) return staticVal(valueTransform(0));
  if (keyframes.length === 1) return staticVal(valueTransform(keyframes[0].value));
  return animatedVal(keyframes.map(kf => toLottieKeyframe(kf, fps, clipStart, valueTransform)));
}

interface TracksByProperty {
  opacity: Keyframe[];
  translateX: Keyframe[];
  translateY: Keyframe[];
  scaleX: Keyframe[];
  scaleY: Keyframe[];
  rotation: Keyframe[];
  drawProgress: Keyframe[];
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
): LottieTransform {
  // Position: base + translateX/Y keyframes
  const positionAnimated = props.translateX.length > 0 || props.translateY.length > 0;
  let p: LottieMultiValue;

  if (positionAnimated) {
    // Merge translateX and translateY into position keyframes
    // Collect all unique times
    const times = new Set<number>();
    for (const kf of props.translateX) times.add(kf.time);
    for (const kf of props.translateY) times.add(kf.time);
    const sortedTimes = [...times].sort((a, b) => a - b);

    const xMap = new Map(props.translateX.map(kf => [kf.time, kf]));
    const yMap = new Map(props.translateY.map(kf => [kf.time, kf]));

    const keyframes: LottieKeyframe[] = sortedTimes.map(t => {
      const xKf = xMap.get(t);
      const yKf = yMap.get(t);
      const tx = xKf?.value ?? 0;
      const ty = yKf?.value ?? 0;
      // Use easing from whichever keyframe exists at this time
      const easing = getEasing(xKf?.easing ?? yKf?.easing ?? 'linear');
      return {
        t: msToFrame(t, fps, clipStart),
        s: [baseX + tx, baseY + ty, 0],
        i: easing.i,
        o: easing.o,
      };
    });

    p = { a: 1, k: keyframes };
  } else {
    p = staticMulti([baseX, baseY, 0]);
  }

  // Scale: combine scaleX and scaleY
  const scaleAnimated = props.scaleX.length > 0 || props.scaleY.length > 0;
  let s: LottieMultiValue;

  if (scaleAnimated) {
    const times = new Set<number>();
    for (const kf of props.scaleX) times.add(kf.time);
    for (const kf of props.scaleY) times.add(kf.time);
    const sortedTimes = [...times].sort((a, b) => a - b);

    const xMap = new Map(props.scaleX.map(kf => [kf.time, kf]));
    const yMap = new Map(props.scaleY.map(kf => [kf.time, kf]));

    const keyframes: LottieKeyframe[] = sortedTimes.map(t => {
      const xKf = xMap.get(t);
      const yKf = yMap.get(t);
      const sx = (xKf?.value ?? 1) * 100;
      const sy = (yKf?.value ?? 1) * 100;
      const easing = getEasing(xKf?.easing ?? yKf?.easing ?? 'linear');
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
  const r = props.rotation.length > 0
    ? buildSingleKeyframes(props.rotation, fps, clipStart, v => baseAngle + v)
    : staticVal(baseAngle);

  // Opacity: Excalimate 0–1 → Lottie 0–100
  const o = props.opacity.length > 0
    ? buildSingleKeyframes(props.opacity, fps, clipStart, v => v * 100)
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
): LottieTrimPath | null {
  if (props.drawProgress.length === 0) return null;

  return {
    ty: 'tm',
    nm: 'Trim',
    s: staticVal(0),
    e: buildSingleKeyframes(props.drawProgress, fps, clipStart, v => v * 100),
    o: staticVal(0),
  };
}

/**
 * Camera animation → Lottie null parent layer.
 *
 * Instead of a precomp, we create a single null layer that all element layers
 * parent to. Camera translate/scale are applied as inverted keyframes on this
 * null layer, effectively moving/scaling all content in the opposite direction.
 *
 * Camera translate values are in scene units and need to be scaled to
 * composition units. Camera scale is inverted: camera scaleX=2 (zoomed out)
 * → null layer scale=50% (content shrinks).
 */
import type { LottieNullLayer, LottieKeyframe, LottieTransform } from './types';
import { staticVal, staticMulti, animatedMulti } from './types';
import type { AnimationTrack } from '../../../types/animation';
import { groupTracksByProperty } from './keyframeConverter';
import { getEasing } from './easingMap';
import { interpolate } from '@excalimate/animation-core';

const CAMERA_ID = '__camera_frame__';
const ADAPTIVE_CAMERA_TOLERANCE = 0.0025;
const MAX_ADAPTIVE_CAMERA_SAMPLES = 1_024;

/**
 * Build a null parent layer for camera animation.
 * Returns null if no camera animation exists.
 */
export function buildCameraLayer(
  tracks: AnimationTrack[],
  compW: number,
  compH: number,
  /** Scale factor: comp units per scene unit */
  sceneSx: number,
  sceneSy: number,
  fps: number,
  clipStart: number,
  clipEnd: number,
  ip: number,
  op: number,
  layerIndex: number,
): LottieNullLayer | null {
  const cameraProps = groupTracksByProperty(tracks, CAMERA_ID);
  const hasCameraAnimation =
    cameraProps.translateX.length > 0 ||
    cameraProps.translateY.length > 0 ||
    cameraProps.scaleX.length > 0 ||
    cameraProps.scaleY.length > 0 ||
    cameraProps.rotation.length > 0;

  if (!hasCameraAnimation) return null;

  const msToFrame = (ms: number) => ((ms - clipStart) / 1000) * fps;
  const sampledTimes = collectCameraSampleTimes(
    [
      cameraProps.translateX,
      cameraProps.translateY,
      cameraProps.scaleX,
      cameraProps.scaleY,
      cameraProps.rotation,
    ],
    clipStart,
    clipEnd,
    (time) => {
      const scaleX = valueAt(cameraProps.scaleX, time, 'scaleX', 1);
      const scaleY = valueAt(cameraProps.scaleY, time, 'scaleY', 1);
      return [
        (-valueAt(cameraProps.translateX, time, 'translateX', 0) * sceneSx) / Math.max(1, compW),
        (-valueAt(cameraProps.translateY, time, 'translateY', 0) * sceneSy) / Math.max(1, compH),
        scaleX === 0 ? 1 : 1 / scaleX,
        scaleY === 0 ? 1 : 1 / scaleY,
        -valueAt(cameraProps.rotation, time, 'rotation', 0) / 180,
      ];
    },
  );

  // Position: comp center + inverted camera translate (scaled to comp units)
  const basePosX = compW / 2;
  const basePosY = compH / 2;

  let p: LottieTransform['p'];
  if (cameraProps.translateX.length > 0 || cameraProps.translateY.length > 0) {
    // Collect all times from both translate and scale tracks
    // (we need scale at each time to compensate for parent scale)
    const keyframes: LottieKeyframe[] = sampledTimes.map((t) => {
      const camScaleX = valueAt(cameraProps.scaleX, t, 'scaleX', 1);
      const camScaleY = valueAt(cameraProps.scaleY, t, 'scaleY', 1);

      // Invert camera translate (scene units → comp units).
      // Divide by inverted camera scale to compensate for parent scale transform,
      // so the visual displacement matches regardless of zoom level.
      const invScaleX = camScaleX !== 0 ? 1 / camScaleX : 1;
      const invScaleY = camScaleY !== 0 ? 1 / camScaleY : 1;
      const tx = -valueAt(cameraProps.translateX, t, 'translateX', 0) * sceneSx * invScaleX;
      const ty = -valueAt(cameraProps.translateY, t, 'translateY', 0) * sceneSy * invScaleY;

      const easing = getEasing('linear');
      return {
        t: msToFrame(t),
        s: [basePosX + tx, basePosY + ty, 0],
        i: easing.i,
        o: easing.o,
      };
    });
    p = animatedMulti(keyframes);
  } else {
    p = staticMulti([basePosX, basePosY, 0]);
  }

  // Scale: invert camera scale (camera scaleX=2 → content scale=50%)
  let s: LottieTransform['s'];
  if (cameraProps.scaleX.length > 0 || cameraProps.scaleY.length > 0) {
    const keyframes: LottieKeyframe[] = sampledTimes.map((t) => {
      // Invert: camera scale 2 → content scale 50%
      const csx = (1 / valueAt(cameraProps.scaleX, t, 'scaleX', 1)) * 100;
      const csy = (1 / valueAt(cameraProps.scaleY, t, 'scaleY', 1)) * 100;
      const easing = getEasing('linear');
      return {
        t: msToFrame(t),
        s: [csx, csy, 100],
        i: easing.i,
        o: easing.o,
      };
    });
    s = animatedMulti(keyframes);
  } else {
    s = staticMulti([100, 100, 100]);
  }

  const transform: LottieTransform = {
    a: staticMulti([compW / 2, compH / 2, 0]),
    p,
    s,
    r:
      cameraProps.rotation.length > 0
        ? {
            a: 1,
            k: sampledTimes.map((time) => {
              const easing = getEasing('linear');
              return {
                t: msToFrame(time),
                s: [-valueAt(cameraProps.rotation, time, 'rotation', 0)],
                i: easing.i,
                o: easing.o,
              };
            }),
          }
        : staticVal(0),
    o: staticVal(100),
  };

  return {
    ty: 3,
    nm: 'Camera',
    ind: layerIndex,
    ip,
    op,
    st: 0,
    ks: transform,
  };
}

function valueAt(
  keyframes: AnimationTrack['keyframes'],
  time: number,
  property: AnimationTrack['property'],
  fallback: number,
): number {
  return keyframes.length === 0 ? fallback : interpolate(keyframes, time, property);
}

function collectCameraSampleTimes(
  propertyKeyframes: readonly AnimationTrack['keyframes'][],
  clipStart: number,
  clipEnd: number,
  sampleDerived: (time: number) => readonly number[],
): number[] {
  const times = new Set<number>([clipStart, clipEnd]);
  for (const keyframesInput of propertyKeyframes) {
    for (const keyframe of keyframesInput) {
      if (keyframe.time > clipStart && keyframe.time < clipEnd) times.add(keyframe.time);
    }
  }
  while (times.size < MAX_ADAPTIVE_CAMERA_SAMPLES) {
    const sorted = [...times].sort((left, right) => left - right);
    let selected: { time: number; error: number; start: number } | undefined;
    for (let index = 1; index < sorted.length; index += 1) {
      const start = sorted[index - 1];
      const end = sorted[index];
      const startValue = sampleDerived(start);
      const endValue = sampleDerived(end);
      for (const fraction of [0.25, 0.5, 0.75]) {
        const time = start + (end - start) * fraction;
        const actual = sampleDerived(time);
        const error = actual.reduce(
          (maximum, value, component) =>
            Math.max(
              maximum,
              Math.abs(
                value -
                  (startValue[component] +
                    (endValue[component] - startValue[component]) * fraction),
              ),
            ),
          0,
        );
        if (
          error > ADAPTIVE_CAMERA_TOLERANCE &&
          (!selected ||
            error > selected.error ||
            (error === selected.error && start < selected.start))
        ) {
          selected = { time, error, start };
        }
      }
    }
    if (!selected) break;
    times.add(selected.time);
  }
  return [...times].sort((left, right) => left - right);
}

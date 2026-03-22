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

const CAMERA_ID = '__camera_frame__';

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
  ip: number,
  op: number,
  layerIndex: number,
): LottieNullLayer | null {
  const cameraProps = groupTracksByProperty(tracks, CAMERA_ID);
  const hasCameraAnimation =
    cameraProps.translateX.length > 0 ||
    cameraProps.translateY.length > 0 ||
    cameraProps.scaleX.length > 0 ||
    cameraProps.scaleY.length > 0;

  if (!hasCameraAnimation) return null;

  const msToFrame = (ms: number) => Math.round(((ms - clipStart) / 1000) * fps);

  // Position: comp center + inverted camera translate (scaled to comp units)
  const basePosX = compW / 2;
  const basePosY = compH / 2;

  let p: LottieTransform['p'];
  if (cameraProps.translateX.length > 0 || cameraProps.translateY.length > 0) {
    // Collect all times from both translate and scale tracks
    // (we need scale at each time to compensate for parent scale)
    const times = new Set<number>();
    for (const kf of cameraProps.translateX) times.add(kf.time);
    for (const kf of cameraProps.translateY) times.add(kf.time);
    for (const kf of cameraProps.scaleX) times.add(kf.time);
    for (const kf of cameraProps.scaleY) times.add(kf.time);
    const sortedTimes = [...times].sort((a, b) => a - b);

    const txMap = new Map(cameraProps.translateX.map(kf => [kf.time, kf]));
    const tyMap = new Map(cameraProps.translateY.map(kf => [kf.time, kf]));
    const sxMap = new Map(cameraProps.scaleX.map(kf => [kf.time, kf]));
    const syMap = new Map(cameraProps.scaleY.map(kf => [kf.time, kf]));

    const keyframes: LottieKeyframe[] = sortedTimes.map(t => {
      const xKf = txMap.get(t);
      const yKf = tyMap.get(t);
      const camScaleX = sxMap.get(t)?.value ?? 1;
      const camScaleY = syMap.get(t)?.value ?? 1;

      // Invert camera translate (scene units → comp units).
      // Divide by inverted camera scale to compensate for parent scale transform,
      // so the visual displacement matches regardless of zoom level.
      const invScaleX = camScaleX !== 0 ? 1 / camScaleX : 1;
      const invScaleY = camScaleY !== 0 ? 1 / camScaleY : 1;
      const tx = -(xKf?.value ?? 0) * sceneSx * invScaleX;
      const ty = -(yKf?.value ?? 0) * sceneSy * invScaleY;

      const easing = getEasing(xKf?.easing ?? yKf?.easing ?? 'linear');
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
    const times = new Set<number>();
    for (const kf of cameraProps.scaleX) times.add(kf.time);
    for (const kf of cameraProps.scaleY) times.add(kf.time);
    const sortedTimes = [...times].sort((a, b) => a - b);

    const xMap = new Map(cameraProps.scaleX.map(kf => [kf.time, kf]));
    const yMap = new Map(cameraProps.scaleY.map(kf => [kf.time, kf]));

    const keyframes: LottieKeyframe[] = sortedTimes.map(t => {
      const xKf = xMap.get(t);
      const yKf = yMap.get(t);
      // Invert: camera scale 2 → content scale 50%
      const csx = (1 / (xKf?.value ?? 1)) * 100;
      const csy = (1 / (yKf?.value ?? 1)) * 100;
      const easing = getEasing(xKf?.easing ?? yKf?.easing ?? 'linear');
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
    r: staticVal(0),
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

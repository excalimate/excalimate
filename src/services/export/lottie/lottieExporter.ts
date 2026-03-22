/**
 * Lottie export — converts Excalimate scene + animation to Lottie JSON.
 *
 * Coordinate mapping:
 * - Excalidraw uses absolute scene coordinates (x, y from top-left)
 * - Lottie composition is sized to the camera frame
 * - All element positions are offset so camera center = composition center
 * - For shapes (rect, ellipse, diamond): position = element center
 * - For linear elements (arrow, line): position = element origin (x, y),
 *   and points are drawn relative to that origin
 */
import type { LottieAnimation, LottieLayer, LottieShapeLayer } from './types';
import { staticMulti } from './types';
import { buildRectShapes, buildEllipseShapes, buildDiamondShapes, buildPathShapes } from './shapeBuilders';
import { buildTextLayer } from './textLayer';
import { groupTracksByProperty, buildTransform, buildTrimPath } from './keyframeConverter';
import { buildGroupLayers } from './groupHierarchy';
import { buildCameraLayer } from './cameraComposition';
import type { AnimatableTarget } from '../../../types/excalidraw';
import type { AnimationTrack } from '../../../types/animation';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ExcalElement = Record<string, any>;

const CAMERA_FRAME_ID = '__camera_frame__';

export interface LottieExportOptions {
  elements: ExcalElement[];
  targets: AnimatableTarget[];
  tracks: AnimationTrack[];
  fps: number;
  clipStart: number;
  clipEnd: number;
  /** Camera frame definition from projectStore */
  cameraFrame: { x: number; y: number; width: number; height: number };
  /** Output resolution (pixels) */
  width: number;
  height: number;
}

/**
 * Compute the element's anchor position in scene coordinates.
 * - Shapes (rect, ellipse, diamond): center of the bounding box
 * - Linear elements (arrow, line): the element origin (x, y) — points are relative to this
 */
function getElementPosition(el: ExcalElement): { x: number; y: number } {
  const type = el.type as string;
  if (type === 'arrow' || type === 'line') {
    // For linear elements, Lottie layer position = element origin.
    // The path points are drawn relative to this origin.
    return { x: el.x ?? 0, y: el.y ?? 0 };
  }
  // For shapes and text: center of bounding box
  return {
    x: (el.x ?? 0) + (el.width ?? 0) / 2,
    y: (el.y ?? 0) + (el.height ?? 0) / 2,
  };
}

/**
 * Generate a complete Lottie animation JSON from Excalimate data.
 */
export function generateLottie(options: LottieExportOptions): LottieAnimation {
  const { elements, targets, tracks, fps, clipStart, clipEnd, cameraFrame, width, height } = options;

  const durationMs = clipEnd - clipStart;
  const totalFrames = Math.ceil((durationMs / 1000) * fps);
  const ip = 0;
  const op = totalFrames;

  // Lottie composition is sized to the output resolution (e.g. 1920×1080).
  // Scene coordinates are mapped to composition coordinates:
  //   compX = (sceneX - camLeft) / cameraWidth * outputWidth
  // This ensures the camera frame maps exactly to the full composition.
  const sx = width / cameraFrame.width;
  const sy = height / cameraFrame.height;
  const camLeft = cameraFrame.x - cameraFrame.width / 2;
  const camTop = cameraFrame.y - cameraFrame.height / 2;

  /** Convert scene coordinate to Lottie composition coordinate */
  function toComp(sceneX: number, sceneY: number): { x: number; y: number } {
    return {
      x: (sceneX - camLeft) * sx,
      y: (sceneY - camTop) * sy,
    };
  }


  // Build group null layers first
  const { groupLayers, parentMap } = buildGroupLayers(
    targets, tracks, fps, clipStart, ip, op,
    elements.length + 1,
  );

  // Convert each element to a Lottie layer
  const elementLayers: LottieLayer[] = [];
  let layerIdx = 1;

  for (const el of elements) {
    if (el.isDeleted) continue;
    if (el.id === CAMERA_FRAME_ID) continue;

    const target = targets.find(t => t.id === el.id);
    const elType = el.type as string;

    // Skip unsupported types
    if (elType === 'freedraw' || elType === 'image' || elType === 'frame') {
      layerIdx++;
      continue;
    }

    // Get element position in scene coords, then map to composition coords
    const scenePos = getElementPosition(el);
    const compPos = toComp(scenePos.x, scenePos.y);

    // Build animated transform
    const props = groupTracksByProperty(tracks, el.id);
    const baseAngle = (el.angle ?? 0) * (180 / Math.PI);
    const baseOpacity = el.opacity ?? 100;

    // Scale translate keyframes from scene units to composition units
    const scaledProps = {
      ...props,
      translateX: props.translateX.map(kf => ({ ...kf, value: kf.value * sx })),
      translateY: props.translateY.map(kf => ({ ...kf, value: kf.value * sy })),
    };

    if (elType === 'text') {
      const textLayer = buildTextLayer(el, layerIdx, ip, op);
      textLayer.ks = buildTransform(compPos.x, compPos.y, baseAngle, baseOpacity, scaledProps, fps, clipStart);

      const parentIdx = parentMap.get(el.id);
      if (parentIdx !== undefined) textLayer.parent = parentIdx;

      elementLayers.push(textLayer);
      layerIdx++;
      continue;
    }

    // Shape layer — pass scale factors so shapes are sized to composition units
    let shapeGroup;
    switch (elType) {
      case 'rectangle':
        shapeGroup = buildRectShapes(el, sx, sy);
        break;
      case 'ellipse':
        shapeGroup = buildEllipseShapes(el, sx, sy);
        break;
      case 'diamond':
        shapeGroup = buildDiamondShapes(el, sx, sy);
        break;
      case 'arrow':
      case 'line':
        shapeGroup = buildPathShapes(el, sx, sy);
        break;
      default:
        shapeGroup = buildRectShapes(el, sx, sy);
    }

    // Add trim path for drawProgress animation
    const trimPath = buildTrimPath(scaledProps, fps, clipStart);
    if (trimPath) {
      shapeGroup.it.splice(shapeGroup.it.length - 1, 0, trimPath);
    }

    const transform = buildTransform(compPos.x, compPos.y, baseAngle, baseOpacity, scaledProps, fps, clipStart);

    // Set anchor point to [0,0] — shapes are drawn relative to anchor
    transform.a = staticMulti([0, 0, 0]);

    const shapeLayer: LottieShapeLayer = {
      ty: 4,
      nm: target?.label ?? el.id,
      ind: layerIdx,
      ip,
      op,
      st: 0,
      ks: transform,
      shapes: [shapeGroup],
    };

    const parentIdx = parentMap.get(el.id);
    if (parentIdx !== undefined) shapeLayer.parent = parentIdx;

    elementLayers.push(shapeLayer);
    layerIdx++;
  }

  // Build camera null layer if camera animation exists.
  // All element layers parent to this so camera pan/zoom affects everything.
  const cameraLayer = buildCameraLayer(
    tracks, Math.round(width), Math.round(height), sx, sy,
    fps, clipStart, ip, op, layerIdx,
  );

  if (cameraLayer) {
    // Parent all element and group layers to the camera null layer
    for (const layer of elementLayers) {
      if (layer.parent === undefined) layer.parent = cameraLayer.ind;
    }
    for (const layer of groupLayers) {
      if (layer.parent === undefined) layer.parent = cameraLayer.ind;
    }
  }

  // Lottie renders layers top-to-bottom, so reverse for correct z-order
  const allLayers: LottieLayer[] = [
    ...elementLayers.reverse(),
    ...groupLayers,
    ...(cameraLayer ? [cameraLayer] : []),
  ];

  const animation: LottieAnimation = {
    v: '5.7.4',
    fr: fps,
    w: Math.round(width),
    h: Math.round(height),
    ip,
    op,
    layers: allLayers,
    assets: [],
    nm: 'Excalimate Animation',
  };

  return animation;
}

export { ViewportTransform, DEFAULT_VIEWPORT, MIN_ZOOM, MAX_ZOOM } from './ViewportTransform';
export type { Point, Rect, ViewportState } from './ViewportTransform';

export {
  getElementAABB,
  aabbToBounds,
  getAnimatedBounds,
  getAnimatedOrientedRect,
  unionBounds,
  getTargetAnimatedBounds,
  buildAnimatedBoundsMap,
} from './ElementBounds';
export type { AABB } from './ElementBounds';

export {
  elementAtPoint,
  elementsInRect,
  pointInRotatedRect,
  findTopmostGroup,
  findTargetAtSameLevel,
  drillDown,
} from './HitTesting';

export {
  getTransformHandles,
  hitTestHandle,
  getResizeAnchor,
  computeResizeDeltas,
  computeRotationDelta,
} from './TransformHandles';
export type { HandleDirection, TransformHandle, OrientedRect } from './TransformHandles';

export { SceneRenderer } from './SceneRenderer';
export type { TransientState, RenderResult } from './SceneRenderer';

export { InteractionManager } from './InteractionManager';
export type { InteractionState, InteractionCallbacks } from './InteractionManager';

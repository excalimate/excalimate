/**
 * ElementBounds — Bounding box computation for Excalidraw elements.
 *
 * Computes axis-aligned bounding boxes (AABB) for elements, accounting for
 * rotation. Also computes animated bounds by applying animation state offsets.
 *
 * Follows Excalidraw's pattern of per-element-type bounds computation with
 * rotation handling (rotate corners → find min/max).
 */

import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types';
import type { ElementAnimationState, FrameState } from '../../types/animation';
import type { AnimatableTarget, Bounds } from '../../types/excalidraw';
import { CAMERA_FRAME_TARGET_ID } from '../../stores/projectStore';

export interface AABB {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

// ── Core Geometry Helpers ─────────────────────────────────────────

function rotatePoint(
  px: number, py: number,
  cx: number, cy: number,
  angle: number,
): [number, number] {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const dx = px - cx;
  const dy = py - cy;
  return [cx + dx * cos - dy * sin, cy + dx * sin + dy * cos];
}

/**
 * Compute the axis-aligned bounding box for a rotated rectangle.
 * Element (x, y) is the top-left corner; angle is in radians.
 */
function rotatedRectAABB(
  x: number, y: number,
  w: number, h: number,
  angle: number,
): AABB {
  if (angle === 0) {
    return { minX: x, minY: y, maxX: x + w, maxY: y + h };
  }

  const cx = x + w / 2;
  const cy = y + h / 2;

  const corners: [number, number][] = [
    rotatePoint(x, y, cx, cy, angle),
    rotatePoint(x + w, y, cx, cy, angle),
    rotatePoint(x + w, y + h, cx, cy, angle),
    rotatePoint(x, y + h, cx, cy, angle),
  ];

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [px, py] of corners) {
    if (px < minX) minX = px;
    if (py < minY) minY = py;
    if (px > maxX) maxX = px;
    if (py > maxY) maxY = py;
  }

  return { minX, minY, maxX, maxY };
}

/**
 * Compute AABB for linear elements (arrows, lines) from their points array.
 */
function linearElementAABB(el: ExcalidrawElement): AABB {
  const points = (el as any).points as number[][] | undefined;
  if (!points || points.length === 0) {
    return rotatedRectAABB(el.x, el.y, el.width, el.height, el.angle ?? 0);
  }

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [px, py] of points) {
    const ax = el.x + px;
    const ay = el.y + py;
    if (ax < minX) minX = ax;
    if (ay < minY) minY = ay;
    if (ax > maxX) maxX = ax;
    if (ay > maxY) maxY = ay;
  }

  // Account for rotation
  if (el.angle && el.angle !== 0) {
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const w = maxX - minX;
    const h = maxY - minY;
    return rotatedRectAABB(minX, minY, w, h, el.angle);
  }

  return { minX, minY, maxX, maxY };
}

// ── Public API ───────────────────────────────────────────────────

/**
 * Compute AABB for a single Excalidraw element.
 */
export function getElementAABB(el: ExcalidrawElement): AABB {
  const type = el.type;

  if (type === 'arrow' || type === 'line' || type === 'freedraw') {
    return linearElementAABB(el);
  }

  // For ellipse, diamond, rectangle, text, image, frame — use rotated rect
  return rotatedRectAABB(el.x, el.y, el.width, el.height, el.angle ?? 0);
}

/**
 * Convert AABB to our Bounds format (x, y, width, height, centerX, centerY).
 */
export function aabbToBounds(aabb: AABB): Bounds {
  const w = aabb.maxX - aabb.minX;
  const h = aabb.maxY - aabb.minY;
  return {
    x: aabb.minX,
    y: aabb.minY,
    width: w,
    height: h,
    centerX: aabb.minX + w / 2,
    centerY: aabb.minY + h / 2,
  };
}

/**
 * Compute the bounding box for an element with animation transforms applied.
 * For linear elements (arrows/lines), uses points extent to compute correct
 * bounds after scaling (since points are scaled in applyAnimationToElements).
 */
export function getAnimatedBounds(
  originalBounds: Bounds,
  originalAngle: number,
  state: ElementAnimationState | undefined,
  rawOrigin?: NonNullable<import('../../types/excalidraw').AnimatableTarget['rawOrigin']>,
): Bounds {
  if (!state) return originalBounds;

  const tx = state.translateX;
  const ty = state.translateY;
  const sx = state.scaleX;
  const sy = state.scaleY;
  const rot = state.rotation * (Math.PI / 180);

  let x: number, y: number, w: number, h: number;

  if (rawOrigin && rawOrigin.pointsMinX !== undefined) {
    // Linear element (arrow/line/freedraw): compute from scaled points extent
    // applyAnimationToElements does: origin moves by tx, points scale by sx
    const originX = rawOrigin.x + tx;
    const originY = rawOrigin.y + ty;
    const minPx = rawOrigin.pointsMinX! * sx;
    const maxPx = rawOrigin.pointsMaxX! * sx;
    const minPy = rawOrigin.pointsMinY! * sy;
    const maxPy = rawOrigin.pointsMaxY! * sy;
    x = originX + Math.min(minPx, maxPx);
    y = originY + Math.min(minPy, maxPy);
    w = Math.abs(maxPx - minPx);
    h = Math.abs(maxPy - minPy);
  } else if (rawOrigin) {
    // Non-linear element: use raw x/width directly
    const rawX = rawOrigin.x + tx;
    const rawY = rawOrigin.y + ty;
    const rawW = rawOrigin.width * sx;
    const rawH = rawOrigin.height * sy;
    x = Math.min(rawX, rawX + rawW);
    y = Math.min(rawY, rawY + rawH);
    w = Math.abs(rawW);
    h = Math.abs(rawH);
  } else {
    // Fallback for groups (no rawOrigin) — use normalized bounds
    x = originalBounds.x + tx;
    y = originalBounds.y + ty;
    w = originalBounds.width * sx;
    h = originalBounds.height * sy;
  }

  // Ensure positive dimensions
  w = Math.max(w, 1);
  h = Math.max(h, 1);

  const totalAngle = originalAngle + rot;
  if (totalAngle !== 0) {
    const aabb = rotatedRectAABB(x, y, w, h, totalAngle);
    return aabbToBounds(aabb);
  }

  return { x, y, width: w, height: h, centerX: x + w / 2, centerY: y + h / 2 };
}

/**
 * Compute the non-rotated (oriented) bounds of an animated element.
 * Returns the rect before rotation is applied (for handle positioning).
 */
export function getAnimatedOrientedRect(
  originalBounds: Bounds,
  state: ElementAnimationState | undefined,
  rawOrigin?: NonNullable<import('../../types/excalidraw').AnimatableTarget['rawOrigin']>,
): { x: number; y: number; width: number; height: number; cx: number; cy: number } {
  const tx = state?.translateX ?? 0;
  const ty = state?.translateY ?? 0;
  const sx = state?.scaleX ?? 1;
  const sy = state?.scaleY ?? 1;

  let x: number, y: number, w: number, h: number;

  if (rawOrigin && rawOrigin.pointsMinX !== undefined) {
    const originX = rawOrigin.x + tx;
    const originY = rawOrigin.y + ty;
    const minPx = rawOrigin.pointsMinX! * sx;
    const maxPx = rawOrigin.pointsMaxX! * sx;
    const minPy = rawOrigin.pointsMinY! * sy;
    const maxPy = rawOrigin.pointsMaxY! * sy;
    x = originX + Math.min(minPx, maxPx);
    y = originY + Math.min(minPy, maxPy);
    w = Math.abs(maxPx - minPx);
    h = Math.abs(maxPy - minPy);
  } else if (rawOrigin) {
    const rawX = rawOrigin.x + tx;
    const rawY = rawOrigin.y + ty;
    const rawW = rawOrigin.width * sx;
    const rawH = rawOrigin.height * sy;
    x = Math.min(rawX, rawX + rawW);
    y = Math.min(rawY, rawY + rawH);
    w = Math.abs(rawW);
    h = Math.abs(rawH);
  } else {
    x = originalBounds.x + tx;
    y = originalBounds.y + ty;
    w = originalBounds.width * sx;
    h = originalBounds.height * sy;
  }

  w = Math.max(w, 1);
  h = Math.max(h, 1);

  return { x, y, width: w, height: h, cx: x + w / 2, cy: y + h / 2 };
}

/**
 * Compute a bounding box that encompasses all given bounds.
 */
export function unionBounds(boundsArray: Bounds[]): Bounds {
  if (boundsArray.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0, centerX: 0, centerY: 0 };
  }

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const b of boundsArray) {
    if (b.x < minX) minX = b.x;
    if (b.y < minY) minY = b.y;
    if (b.x + b.width > maxX) maxX = b.x + b.width;
    if (b.y + b.height > maxY) maxY = b.y + b.height;
  }

  const w = maxX - minX;
  const h = maxY - minY;
  return { x: minX, y: minY, width: w, height: h, centerX: minX + w / 2, centerY: minY + h / 2 };
}

/**
 * Compute animated bounds for a target (element or group).
 * For groups, returns the union of all member animated bounds.
 */
export function getTargetAnimatedBounds(
  target: AnimatableTarget,
  frameState: FrameState,
  allTargets: AnimatableTarget[],
): Bounds {
  if (target.type === 'element') {
    // Get element's own state + cascade parent group transforms
    const elementState = frameState.get(target.id);
    const combinedState = cascadeGroupState(target.id, elementState, target, allTargets, frameState);
    return getAnimatedBounds(target.originalBounds, target.originalAngle, combinedState, target.rawOrigin);
  }

  // Group: union of member bounds
  const memberBounds: Bounds[] = [];
  for (const eid of target.elementIds) {
    const memberTarget = allTargets.find(t => t.id === eid);
    if (memberTarget) {
      const state = frameState.get(eid);
      // Apply this group's animation + element's own animation
      const groupState = frameState.get(target.id);
      const combinedState = combineStates(state, groupState, eid);
      memberBounds.push(getAnimatedBounds(memberTarget.originalBounds, memberTarget.originalAngle, combinedState, memberTarget.rawOrigin));
    }
  }

  return unionBounds(memberBounds);
}

/**
 * Cascade parent group transforms onto an element's state.
 * Walks up the group hierarchy and accumulates transforms.
 */
function cascadeGroupState(
  elementId: string,
  elementState: ElementAnimationState | undefined,
  target: AnimatableTarget,
  allTargets: AnimatableTarget[],
  frameState: FrameState,
): ElementAnimationState | undefined {
  // Find parent group(s) that contain this element
  const parentGroups = allTargets.filter(
    t => t.type === 'group' && t.elementIds.includes(elementId),
  );

  if (parentGroups.length === 0) return elementState;

  // Accumulate group transforms
  let result = elementState;
  for (const group of parentGroups) {
    const groupState = frameState.get(group.id);
    if (groupState) {
      result = combineStates(result, groupState, elementId);
    }
  }

  return result;
}

/**
 * Combine element state with group state (additive translate, multiplicative scale).
 */
function combineStates(
  elementState: ElementAnimationState | undefined,
  groupState: ElementAnimationState | undefined,
  elementId: string,
): ElementAnimationState | undefined {
  if (!elementState && !groupState) return undefined;
  return {
    targetId: elementId,
    opacity: (elementState?.opacity ?? 1) * (groupState?.opacity ?? 1),
    translateX: (elementState?.translateX ?? 0) + (groupState?.translateX ?? 0),
    translateY: (elementState?.translateY ?? 0) + (groupState?.translateY ?? 0),
    scaleX: (elementState?.scaleX ?? 1) * (groupState?.scaleX ?? 1),
    scaleY: (elementState?.scaleY ?? 1) * (groupState?.scaleY ?? 1),
    rotation: (elementState?.rotation ?? 0) + (groupState?.rotation ?? 0),
    drawProgress: elementState?.drawProgress ?? 1,
  };
}

/**
 * Build a complete map of target ID → animated bounds for all targets.
 */
export function buildAnimatedBoundsMap(
  targets: AnimatableTarget[],
  frameState: FrameState,
): Map<string, Bounds> {
  const map = new Map<string, Bounds>();

  for (const target of targets) {
    if (target.id === CAMERA_FRAME_TARGET_ID) continue;
    map.set(target.id, getTargetAnimatedBounds(target, frameState, targets));
  }

  return map;
}

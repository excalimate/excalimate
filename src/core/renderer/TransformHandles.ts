/**
 * TransformHandles — Handle position computation for selection/resize.
 *
 * Computes positions for 8 resize handles (4 corners + 4 edges) and
 * 1 rotation handle. Handles are positioned in scene space, then
 * converted to screen space for rendering. Handle sizes stay constant
 * on screen regardless of zoom level.
 *
 * Inspired by Excalidraw's transformHandles.ts.
 */

import type { Point } from './ViewportTransform';

export type HandleDirection = 'n' | 's' | 'e' | 'w' | 'nw' | 'ne' | 'sw' | 'se' | 'rotation';

export interface TransformHandle {
  id: HandleDirection;
  /** Screen-space position (top-left of handle rect) */
  x: number;
  y: number;
  /** Handle size in screen pixels */
  size: number;
  /** CSS cursor value */
  cursor: string;
}

/** Handle size in screen pixels (constant regardless of zoom). */
const HANDLE_SIZE = 8;
/** Gap between element and rotation handle, in screen pixels. */
const ROTATION_HANDLE_GAP = 20;
/** Minimum element screen size to show edge (non-corner) handles. */
const MIN_SIZE_FOR_EDGE_HANDLES = 40;

// ── Cursor Mapping ───────────────────────────────────────────────

const BASE_CURSORS: Record<HandleDirection, string> = {
  n: 'ns-resize',
  s: 'ns-resize',
  e: 'ew-resize',
  w: 'ew-resize',
  nw: 'nwse-resize',
  se: 'nwse-resize',
  ne: 'nesw-resize',
  sw: 'nesw-resize',
  rotation: 'grab',
};

/**
 * Rotate cursor direction to match element rotation.
 * Snaps to nearest 45° increment.
 */
function getRotatedCursor(handle: HandleDirection, angle: number): string {
  if (handle === 'rotation') return 'grab';

  // Map handle directions to angles (0° = east, CCW)
  const directionAngles: Record<string, number> = {
    e: 0, se: 45, s: 90, sw: 135,
    w: 180, nw: 225, n: 270, ne: 315,
  };

  const cursorTypes = ['ew-resize', 'nwse-resize', 'ns-resize', 'nesw-resize'];
  const baseAngle = directionAngles[handle] ?? 0;
  const totalAngle = ((baseAngle + (angle * 180 / Math.PI)) % 360 + 360) % 360;
  const index = Math.round(totalAngle / 45) % 4;
  return cursorTypes[index];
}

// ── Handle Position Helpers ──────────────────────────────────────

function rotatePoint(
  px: number, py: number,
  cx: number, cy: number,
  angle: number,
): Point {
  if (angle === 0) return { x: px, y: py };
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const dx = px - cx;
  const dy = py - cy;
  return {
    x: cx + dx * cos - dy * sin,
    y: cy + dx * sin + dy * cos,
  };
}

// ── Public API ───────────────────────────────────────────────────

export interface OrientedRect {
  x: number;
  y: number;
  width: number;
  height: number;
  cx: number;
  cy: number;
}

/**
 * Compute transform handle positions for a selected element.
 *
 * @param orientedRect — The element's non-rotated rect in scene space (before rotation)
 * @param angle — Element's total rotation angle in radians
 * @param zoom — Current viewport zoom level
 * @param screenOffset — Viewport pan offset { x: panX, y: panY }
 * @returns Array of TransformHandle objects with screen-space positions
 */
export function getTransformHandles(
  orientedRect: OrientedRect,
  angle: number,
  zoom: number,
  screenOffset: Point,
): TransformHandle[] {
  const { x, y, width, height, cx, cy } = orientedRect;
  const halfSize = HANDLE_SIZE / 2;

  const screenW = width * zoom;
  const screenH = height * zoom;
  const showEdge = screenW > MIN_SIZE_FOR_EDGE_HANDLES && screenH > MIN_SIZE_FOR_EDGE_HANDLES;

  // Define handle anchor points in scene space (relative to element rect)
  const anchors: { id: HandleDirection; fx: number; fy: number; isEdge: boolean }[] = [
    { id: 'nw', fx: 0, fy: 0, isEdge: false },
    { id: 'ne', fx: 1, fy: 0, isEdge: false },
    { id: 'sw', fx: 0, fy: 1, isEdge: false },
    { id: 'se', fx: 1, fy: 1, isEdge: false },
    { id: 'n', fx: 0.5, fy: 0, isEdge: true },
    { id: 's', fx: 0.5, fy: 1, isEdge: true },
    { id: 'w', fx: 0, fy: 0.5, isEdge: true },
    { id: 'e', fx: 1, fy: 0.5, isEdge: true },
  ];

  const handles: TransformHandle[] = [];

  for (const anchor of anchors) {
    if (anchor.isEdge && !showEdge) continue;

    // Compute scene-space position of handle anchor
    const sceneX = x + width * anchor.fx;
    const sceneY = y + height * anchor.fy;

    // Rotate around element center
    const rotated = rotatePoint(sceneX, sceneY, cx, cy, angle);

    // Convert to screen space
    const screenX = rotated.x * zoom + screenOffset.x - halfSize;
    const screenY = rotated.y * zoom + screenOffset.y - halfSize;

    handles.push({
      id: anchor.id,
      x: screenX,
      y: screenY,
      size: HANDLE_SIZE,
      cursor: getRotatedCursor(anchor.id, angle),
    });
  }

  // Rotation handle: above the element, rotated
  const rotHandleSceneY = y - ROTATION_HANDLE_GAP / zoom;
  const rotHandleScene = rotatePoint(cx, rotHandleSceneY, cx, cy, angle);
  handles.push({
    id: 'rotation',
    x: rotHandleScene.x * zoom + screenOffset.x - halfSize,
    y: rotHandleScene.y * zoom + screenOffset.y - halfSize,
    size: HANDLE_SIZE,
    cursor: 'grab',
  });

  return handles;
}

/**
 * Hit-test a screen-space point against transform handles.
 * Returns the handle direction if hit, null otherwise.
 */
export function hitTestHandle(
  screenX: number,
  screenY: number,
  handles: TransformHandle[],
): HandleDirection | null {
  // Expand hit area slightly for easier clicking
  const expand = 4;

  for (const handle of handles) {
    if (
      screenX >= handle.x - expand &&
      screenX <= handle.x + handle.size + expand &&
      screenY >= handle.y - expand &&
      screenY <= handle.y + handle.size + expand
    ) {
      return handle.id;
    }
  }

  return null;
}

/**
 * Get the anchor point for a resize operation.
 * When resizing from a corner/edge, the anchor is the opposite corner/edge center.
 *
 * @param handle — The handle being dragged
 * @param rect — The oriented rect in scene space
 * @param symmetric — If true (Alt key), anchor is the center
 * @returns Anchor point in scene space
 */
export function getResizeAnchor(
  handle: HandleDirection,
  rect: OrientedRect,
  symmetric: boolean,
): Point {
  if (symmetric || handle === 'rotation') {
    return { x: rect.cx, y: rect.cy };
  }

  const { x, y, width, height } = rect;

  // Anchor is the opposite edge/corner
  switch (handle) {
    case 'nw': return { x: x + width, y: y + height };
    case 'ne': return { x: x, y: y + height };
    case 'sw': return { x: x + width, y: y };
    case 'se': return { x: x, y: y };
    case 'n': return { x: x + width / 2, y: y + height };
    case 's': return { x: x + width / 2, y: y };
    case 'w': return { x: x + width, y: y + height / 2 };
    case 'e': return { x: x, y: y + height / 2 };
    default: return { x: rect.cx, y: rect.cy };
  }
}

/**
 * Compute the scale deltas from a resize gesture.
 *
 * @param handle — Which handle is being dragged
 * @param sceneDeltaX — Mouse movement in scene-space X
 * @param sceneDeltaY — Mouse movement in scene-space Y
 * @param currentWidth — Current width of the element
 * @param currentHeight — Current height of the element
 * @param uniformScale — If true (Shift key), maintain aspect ratio
 * @param symmetric — If true (Alt key), scale from center (doubles the delta)
 * @returns { dSx, dSy } — delta scale factors to ADD to current scale
 */
export function computeResizeDeltas(
  handle: HandleDirection,
  sceneDeltaX: number,
  sceneDeltaY: number,
  currentWidth: number,
  currentHeight: number,
  uniformScale: boolean,
  symmetric: boolean,
): { dSx: number; dSy: number } {
  if (handle === 'rotation') return { dSx: 0, dSy: 0 };

  const affectsX = handle.includes('e') || handle.includes('w');
  const affectsY = handle.includes('s') || handle.includes('n');
  const signX = handle.includes('e') ? 1 : handle.includes('w') ? -1 : 0;
  const signY = handle.includes('s') ? 1 : handle.includes('n') ? -1 : 0;

  let dSx = affectsX ? (signX * sceneDeltaX) / Math.max(currentWidth, 1) : 0;
  let dSy = affectsY ? (signY * sceneDeltaY) / Math.max(currentHeight, 1) : 0;

  // Uniform scale: use average delta
  if (uniformScale) {
    if (affectsX && affectsY) {
      const avg = (Math.abs(dSx) + Math.abs(dSy)) / 2;
      dSx = Math.sign(dSx || 1) * avg;
      dSy = Math.sign(dSy || 1) * avg;
    } else if (affectsX) {
      dSy = dSx;
    } else {
      dSx = dSy;
    }
  }

  // Symmetric: double the delta (scale from center)
  if (symmetric) {
    dSx *= 2;
    dSy *= 2;
  }

  return { dSx, dSy };
}

/**
 * Compute rotation delta from a mouse position relative to element center.
 */
export function computeRotationDelta(
  sceneCursorX: number,
  sceneCursorY: number,
  centerX: number,
  centerY: number,
  startAngle: number,
): number {
  const currentAngle = Math.atan2(sceneCursorY - centerY, sceneCursorX - centerX);
  return (currentAngle - startAngle) * (180 / Math.PI); // return degrees
}

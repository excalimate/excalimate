/**
 * HitTesting — Mathematical hit-testing for elements without SVG DOM.
 *
 * Tests whether a scene-space point or rectangle intersects with elements,
 * using bounding box geometry. No DOM queries needed.
 */

import type { AnimatableTarget, Bounds } from '../../types/excalidraw';
import type { FrameState } from '../../types/animation';
import {
  getTargetAnimatedBounds,
  getAnimatedOrientedRect,
} from './ElementBounds';
import { CAMERA_FRAME_TARGET_ID } from '../../stores/projectStore';

/** Tolerance in scene units for edge hit-testing. */
const HIT_TOLERANCE = 4;

// ── Core Geometry ────────────────────────────────────────────────

/**
 * Test if a point is inside a rectangle (optionally rotated around its center).
 */
export function pointInRotatedRect(
  px: number, py: number,
  rect: { x: number; y: number; width: number; height: number },
  angle: number,
): boolean {
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;

  // Rotate point into the rect's local coordinate system
  let lx: number, ly: number;
  if (angle !== 0) {
    const cos = Math.cos(-angle);
    const sin = Math.sin(-angle);
    const dx = px - cx;
    const dy = py - cy;
    lx = cx + dx * cos - dy * sin;
    ly = cy + dx * sin + dy * cos;
  } else {
    lx = px;
    ly = py;
  }

  return (
    lx >= rect.x - HIT_TOLERANCE &&
    lx <= rect.x + rect.width + HIT_TOLERANCE &&
    ly >= rect.y - HIT_TOLERANCE &&
    ly <= rect.y + rect.height + HIT_TOLERANCE
  );
}

/**
 * Test if two axis-aligned rectangles overlap.
 */
function rectsOverlap(a: Bounds, b: Bounds): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

// ── Public API ───────────────────────────────────────────────────

/**
 * Find the topmost target at a given scene-space point.
 * First tests individual elements (reverse z-order), then falls back to groups.
 * This allows clicking anywhere inside a group's bounding box to select it.
 */
export function elementAtPoint(
  sceneX: number,
  sceneY: number,
  targets: AnimatableTarget[],
  frameState: FrameState,
): string | null {
  // First pass: test individual elements (highest z first)
  const elements = [...targets]
    .filter(t => t.type === 'element' && t.id !== CAMERA_FRAME_TARGET_ID)
    .sort((a, b) => b.zIndex - a.zIndex);

  for (const target of elements) {
    const state = frameState.get(target.id);

    // Skip fully transparent elements
    const opacity = state?.opacity ?? 1;
    if (opacity <= 0) continue;

    const oriented = getAnimatedOrientedRect(target.originalBounds, state, target.rawOrigin);
    const totalAngle = target.originalAngle + ((state?.rotation ?? 0) * Math.PI / 180);

    if (pointInRotatedRect(sceneX, sceneY, oriented, totalAngle)) {
      return target.id;
    }
  }

  // Second pass: test groups (clicking in the gap between group members)
  const groups = targets.filter(t => t.type === 'group' && t.id !== CAMERA_FRAME_TARGET_ID);
  for (const group of groups) {
    const bounds = getTargetAnimatedBounds(group, frameState, targets);
    if (
      sceneX >= bounds.x - HIT_TOLERANCE &&
      sceneX <= bounds.x + bounds.width + HIT_TOLERANCE &&
      sceneY >= bounds.y - HIT_TOLERANCE &&
      sceneY <= bounds.y + bounds.height + HIT_TOLERANCE
    ) {
      // Return the first element in the group (so findTopmostGroup maps it back)
      return group.elementIds[0] ?? group.id;
    }
  }

  return null;
}

/**
 * Find all elements within a selection rectangle (scene-space).
 * Uses AABB intersection for efficiency.
 * Returns leaf element IDs (not group IDs).
 */
export function elementsInRect(
  selectionRect: Bounds,
  targets: AnimatableTarget[],
  frameState: FrameState,
): string[] {
  const result: string[] = [];

  for (const target of targets) {
    if (target.type !== 'element') continue;
    if (target.id === CAMERA_FRAME_TARGET_ID) continue;

    const bounds = getTargetAnimatedBounds(target, frameState, targets);
    if (rectsOverlap(selectionRect, bounds)) {
      result.push(target.id);
    }
  }

  return result;
}

// ── Selection Hierarchy Helpers ──────────────────────────────────

/**
 * Given an element ID, find its immediate parent group.
 * Returns the first parent group, NOT the topmost.
 * Users drill up/down via double-click.
 */
export function findTopmostGroup(
  elementId: string,
  targets: AnimatableTarget[],
): string {
  const target = targets.find(t => t.id === elementId);
  if (!target) return elementId;

  // If element has a parent group, return it (one level up)
  if (target.parentGroupId) {
    const parent = targets.find(t => t.id === target.parentGroupId);
    if (parent) return parent.id;
  }

  return elementId;
}

/**
 * Given a selected target and a clicked element, find the target
 * at the same nesting level (for maintaining selection hierarchy).
 */
export function findTargetAtSameLevel(
  clickedElementId: string,
  currentSelectionId: string,
  targets: AnimatableTarget[],
): string {
  const currentTarget = targets.find(t => t.id === currentSelectionId);
  if (!currentTarget || currentTarget.type !== 'group') return clickedElementId;

  // Find group at the same level as currentTarget
  const parentGroupId = currentTarget.parentGroupId;
  const groups = targets.filter(t => t.type === 'group');
  const siblingGroups = groups.filter(g => g.parentGroupId === parentGroupId);

  for (const group of siblingGroups) {
    if (group.elementIds.includes(clickedElementId)) return group.id;
  }

  return clickedElementId;
}

/**
 * Drill down into a group hierarchy on double-click.
 * If currentSelection is a group and clickedElement is a member,
 * return the next level down (a child group or the element itself).
 */
export function drillDown(
  currentSelectionId: string,
  clickedElementId: string,
  targets: AnimatableTarget[],
): string {
  const currentTarget = targets.find(t => t.id === currentSelectionId);
  if (!currentTarget || currentTarget.type !== 'group') return clickedElementId;

  // Check if clicked element is a direct or indirect member
  if (!isDescendant(clickedElementId, currentTarget, targets)) return clickedElementId;

  // Find a child group that contains the clicked element (directly or indirectly)
  const childGroups = targets.filter(
    t => t.type === 'group' && t.parentGroupId === currentSelectionId,
  );
  for (const child of childGroups) {
    if (isDescendant(clickedElementId, child, targets)) return child.id;
  }

  return clickedElementId;
}

/**
 * Check if an element is a direct or indirect descendant of a group.
 */
function isDescendant(
  elementId: string,
  group: AnimatableTarget,
  targets: AnimatableTarget[],
): boolean {
  if (group.elementIds.includes(elementId)) return true;

  // Check child groups recursively
  for (const childId of group.elementIds) {
    const child = targets.find(t => t.id === childId);
    if (child && child.type === 'group' && isDescendant(elementId, child, targets)) {
      return true;
    }
  }

  return false;
}

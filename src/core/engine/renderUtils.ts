/**
 * Shared animation rendering utilities.
 * Used by both the canvas preview and the export pipeline.
 */

import type { ExcalidrawElement, NonDeletedExcalidrawElement } from '@excalidraw/excalidraw/element/types';
import type { FrameState } from '../../types/animation';
import type { AnimatableTarget } from '../../types/excalidraw';
import { CAMERA_FRAME_TARGET_ID } from '../../stores/projectStore';

/**
 * Build a map of element ID → accumulated animation state,
 * cascading group animations to member elements.
 */
export function buildElementAnimationStates(
  frameState: FrameState,
  targets: AnimatableTarget[],
): Map<string, { tx: number; ty: number; sx: number; sy: number; rot: number; opacity: number }> {
  const elStates = new Map<string, { tx: number; ty: number; sx: number; sy: number; rot: number; opacity: number }>();

  for (const [tid, state] of frameState) {
    if (tid === CAMERA_FRAME_TARGET_ID) continue;
    const { translateX: tx, translateY: ty, scaleX: sx, scaleY: sy, rotation: rot, opacity } = state;
    if (tx === 0 && ty === 0 && sx === 1 && sy === 1 && rot === 0 && opacity === 1) continue;
    const tgt = targets.find(t => t.id === tid);
    for (const eid of (tgt ? tgt.elementIds : [tid])) {
      const p = elStates.get(eid) ?? { tx: 0, ty: 0, sx: 1, sy: 1, rot: 0, opacity: 1 };
      elStates.set(eid, {
        tx: p.tx + tx, ty: p.ty + ty,
        sx: p.sx * sx, sy: p.sy * sy,
        rot: p.rot + rot, opacity: p.opacity * opacity,
      });
    }
  }

  return elStates;
}

/**
 * Clone elements with animation transforms applied to their properties.
 * This produces elements that Excalidraw can render with correct proportions
 * (no CSS scale stretching).
 *
 * Also handles arrow bindings: when a shape an arrow is bound to moves,
 * the arrow's connected endpoint follows.
 */
export function applyAnimationToElements(
  elements: NonDeletedExcalidrawElement[],
  frameState: FrameState,
  targets: AnimatableTarget[],
): ExcalidrawElement[] {
  const elStates = buildElementAnimationStates(frameState, targets);

  // First pass: build element map for binding lookups
  const elementMap = new Map<string, NonDeletedExcalidrawElement>();
  for (const el of elements) elementMap.set(el.id, el);

  // Propagate container animations to bound text elements
  // (e.g., arrow opacity should also apply to its label text)
  for (const el of elements) {
    const containerId = (el as any).containerId as string | null;
    if (containerId && el.type === 'text') {
      const containerState = elStates.get(containerId);
      if (containerState) {
        const textState = elStates.get(el.id);
        if (textState) {
          // Combine: container state cascades onto text's own state
          elStates.set(el.id, {
            tx: textState.tx + containerState.tx,
            ty: textState.ty + containerState.ty,
            sx: textState.sx * containerState.sx,
            sy: textState.sy * containerState.sy,
            rot: textState.rot + containerState.rot,
            opacity: textState.opacity * containerState.opacity,
          });
        } else {
          // Text has no own animation — inherit container's state
          elStates.set(el.id, { ...containerState });
        }
      }
    }
  }

  return elements.map((el) => {
    const a = elStates.get(el.id);
    if (!a) return el; // No animation — return original unchanged (preserves version)

    const c = { ...el } as any;

    // Bump version so Excalidraw detects the change and re-renders
    c.version = (c.version ?? 0) + 1;
    c.versionNonce = Math.random() * 2147483647 | 0;

    // Apply direct animation transforms
    c.x = el.x + a.tx;
    c.y = el.y + a.ty;
    if (a.sx !== 1) c.width = el.width * a.sx;
    if (a.sy !== 1) c.height = el.height * a.sy;
    if (a.rot !== 0) c.angle = (el.angle ?? 0) + (a.rot * Math.PI / 180);
    // Always apply animation opacity (even when 1.0) to override element's base opacity
    c.opacity = Math.round((el.opacity ?? 100) * a.opacity);
    // Scale points for arrows/lines
    if (c.points) {
      c.points = (c.points as number[][]).map(([px, py]: number[]) => [
        a.sx !== 1 ? px * a.sx : px,
        a.sy !== 1 ? py * a.sy : py,
      ]);
    }

    // Arrow binding: when bound shapes move, adjust arrow endpoints
    if ((el.type === 'arrow' || el.type === 'line') && c.points) {
      const startBinding = (el as any).startBinding as { elementId: string } | null;
      const endBinding = (el as any).endBinding as { elementId: string } | null;
      const points = c.points as number[][];

      if (points.length >= 2) {
        let modified = false;

        // If start is bound to a shape that moved, shift the start point
        if (startBinding?.elementId) {
          const boundState = elStates.get(startBinding.elementId);
          const ownState = a;
          if (boundState) {
            // Compute relative movement: how much the bound shape moved vs the arrow
            const relTx = boundState.tx - (ownState?.tx ?? 0);
            const relTy = boundState.ty - (ownState?.ty ?? 0);
            if (Math.abs(relTx) > 0.1 || Math.abs(relTy) > 0.1) {
              // Shift start point and adjust all subsequent points to compensate
              // (move arrow origin to follow bound shape)
              if (!modified) { points[0] = [...points[0]]; modified = true; }
              c.x += relTx;
              c.y += relTy;
              // Adjust all points except first to compensate for origin shift
              for (let i = 1; i < points.length; i++) {
                points[i] = [points[i][0] - relTx, points[i][1] - relTy];
              }
            }
          }
        }

        // If end is bound to a shape that moved, shift the end point
        if (endBinding?.elementId) {
          const boundState = elStates.get(endBinding.elementId);
          const ownState = a;
          if (boundState) {
            const relTx = boundState.tx - (ownState?.tx ?? 0);
            const relTy = boundState.ty - (ownState?.ty ?? 0);
            if (Math.abs(relTx) > 0.1 || Math.abs(relTy) > 0.1) {
              // Shift the last point to follow the bound shape
              const lastIdx = points.length - 1;
              points[lastIdx] = [
                points[lastIdx][0] + relTx,
                points[lastIdx][1] + relTy,
              ];
              // Update width/height to reflect new extent
              let minPx = Infinity, maxPx = -Infinity, minPy = Infinity, maxPy = -Infinity;
              for (const [px, py] of points) {
                if (px < minPx) minPx = px;
                if (px > maxPx) maxPx = px;
                if (py < minPy) minPy = py;
                if (py > maxPy) maxPy = py;
              }
              c.width = maxPx - minPx;
              c.height = maxPy - minPy;
            }
          }
        }

        c.points = points;
      }
    }

    return c as ExcalidrawElement;
  });
}

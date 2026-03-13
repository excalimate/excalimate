/**
 * SceneRenderer — Canvas-based scene renderer with caching.
 *
 * Renders the Excalidraw scene with animation transforms applied,
 * using Excalidraw's `exportToCanvas` for high-quality output.
 *
 * Key optimizations:
 * - Geometry hash: skip re-render if only translation changed
 * - Render deduplication: coalesce rapid state changes
 * - Stale render cancellation: abort previous render when new one requested
 */

import { exportToCanvas, getNonDeletedElements } from '@excalidraw/excalidraw';
import type { ExcalidrawElement, NonDeletedExcalidrawElement } from '@excalidraw/excalidraw/element/types';
import type { ExcalidrawSceneData, AnimatableTarget } from '../../types/excalidraw';
import type { FrameState, ElementAnimationState } from '../../types/animation';
import { applyAnimationToElements } from '../engine/renderUtils';
import { CAMERA_FRAME_TARGET_ID } from '../../stores/projectStore';

/** Transient state applied during interactive drag/resize (not yet committed). */
export interface TransientState {
  /** Target IDs being actively manipulated. */
  activeTargetIds: string[];
  /** Position delta during drag (scene units). */
  dragDelta?: { dx: number; dy: number };
  /** Scale delta during resize. */
  resizeScale?: { dSx: number; dSy: number };
  /** Rotation delta during rotation (degrees). */
  rotationDelta?: number;
}

export interface RenderResult {
  canvas: HTMLCanvasElement;
  /** Scene-space bounds of the rendered content. */
  bounds: { minX: number; minY: number; width: number; height: number };
}

/**
 * Compute a geometry hash from element dimensions, opacity, angle.
 * If only translation changed (same hash), we can skip re-rendering.
 */
function computeGeometryHash(elements: ExcalidrawElement[]): string {
  let hash = '';
  for (const el of elements) {
    // Include ALL properties that affect the rendered output
    hash += `${el.id}:${el.x.toFixed(1)},${el.y.toFixed(1)},${el.width.toFixed(1)},${el.height.toFixed(1)},${(el.angle ?? 0).toFixed(3)},${el.opacity ?? 100};`;
  }
  return hash;
}

export class SceneRenderer {
  private _cachedCanvas: HTMLCanvasElement | null = null;
  private _cachedGeometryHash: string = '';
  private _renderGeneration = 0; // Incremented on each render request, used to cancel stale renders

  /**
   * Render the scene with animation transforms and transient state applied.
   *
   * @param scene — The Excalidraw scene data
   * @param frameState — Current animation frame state
   * @param targets — All animatable targets
   * @param transientState — Interactive feedback state (drag/resize in progress)
   * @param ghostMode — If true, ensure hidden elements have minimum opacity
   * @returns The rendered canvas, or null if render was superseded
   */
  async render(
    scene: ExcalidrawSceneData,
    frameState: FrameState,
    targets: AnimatableTarget[],
    transientState: TransientState | null = null,
    ghostMode = false,
  ): Promise<RenderResult | null> {
    const generation = ++this._renderGeneration;

    const elements = getNonDeletedElements(
      scene.elements as ExcalidrawElement[],
    ) as NonDeletedExcalidrawElement[];

    if (elements.length === 0) return null;

    // Merge transient state into frameState
    const mergedFrameState = transientState
      ? this._mergeTransientState(frameState, transientState)
      : frameState;

    // Apply animation transforms to element clones
    let animated = applyAnimationToElements(elements, mergedFrameState, targets);

    // Ghost mode: ensure hidden elements have minimum visible opacity
    if (ghostMode) {
      const GHOST_MIN_OPACITY = 15;
      animated = animated.map(el => {
        const opacity = (el as any).opacity ?? 100;
        if (opacity < GHOST_MIN_OPACITY) {
          return { ...el, opacity: GHOST_MIN_OPACITY } as ExcalidrawElement;
        }
        return el;
      });
    }

    // Check geometry hash — skip re-render if only translation changed
    const newHash = computeGeometryHash(animated);
    if (newHash === this._cachedGeometryHash && this._cachedCanvas) {
      // Geometry unchanged — reuse cached canvas
      // (The viewport transform handles the translation offset)
      return {
        canvas: this._cachedCanvas,
        bounds: this._computeBounds(animated),
      };
    }

    // Render via Excalidraw's native Canvas2D renderer
    try {
      const srcCanvas = await exportToCanvas({
        elements: animated,
        files: scene.files ?? {},
        appState: { exportBackground: true },
        exportPadding: 30,
      });

      // Check if this render was superseded by a newer one
      if (generation !== this._renderGeneration) {
        return null; // Stale render — discard
      }

      this._cachedCanvas = srcCanvas;
      this._cachedGeometryHash = newHash;

      return {
        canvas: srcCanvas,
        bounds: this._computeBounds(animated),
      };
    } catch (e) {
      console.error('SceneRenderer: render failed', e);
      return null;
    }
  }

  /**
   * Invalidate all caches. Call when scene structure changes
   * (elements added/removed) or when forced re-render is needed.
   */
  invalidateCache(): void {
    this._cachedCanvas = null;
    this._cachedGeometryHash = '';
    this._renderGeneration++;
  }

  /**
   * Merge transient state (interactive drag/resize) into a copy of frameState.
   * The transient state is additive — it adds deltas to the existing animation state.
   */
  private _mergeTransientState(
    frameState: FrameState,
    transient: TransientState,
  ): FrameState {
    const merged = new Map(frameState);

    for (const targetId of transient.activeTargetIds) {
      const existing = merged.get(targetId) ?? {
        targetId,
        opacity: 1,
        translateX: 0,
        translateY: 0,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
        drawProgress: 1,
      };

      const updated: ElementAnimationState = { ...existing };

      if (transient.dragDelta) {
        updated.translateX += transient.dragDelta.dx;
        updated.translateY += transient.dragDelta.dy;
      }

      if (transient.resizeScale) {
        updated.scaleX = Math.max(0.05, updated.scaleX + transient.resizeScale.dSx);
        updated.scaleY = Math.max(0.05, updated.scaleY + transient.resizeScale.dSy);
      }

      if (transient.rotationDelta !== undefined) {
        updated.rotation += transient.rotationDelta;
      }

      merged.set(targetId, updated);
    }

    return merged;
  }

  /**
   * Compute the scene-space bounding box of all animated elements.
   * Uses points array for linear elements (arrows/lines) for correct bounds.
   */
  private _computeBounds(elements: ExcalidrawElement[]): { minX: number; minY: number; width: number; height: number } {
    if (elements.length === 0) return { minX: 0, minY: 0, width: 0, height: 0 };

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const el of elements) {
      const elAny = el as any;
      if (elAny.points && Array.isArray(elAny.points) && elAny.points.length > 0) {
        // Linear element: compute from points + padding for stroke/arrowheads
        const strokeWidth = elAny.strokeWidth ?? 1;
        const pad = strokeWidth / 2 + (el.type === 'arrow' ? 8 : 3);
        for (const [px, py] of elAny.points as number[][]) {
          const ax = el.x + px;
          const ay = el.y + py;
          if (ax - pad < minX) minX = ax - pad;
          if (ay - pad < minY) minY = ay - pad;
          if (ax + pad > maxX) maxX = ax + pad;
          if (ay + pad > maxY) maxY = ay + pad;
        }
      } else {
        const x1 = Math.min(el.x, el.x + el.width);
        const y1 = Math.min(el.y, el.y + el.height);
        const x2 = Math.max(el.x, el.x + el.width);
        const y2 = Math.max(el.y, el.y + el.height);
        if (x1 < minX) minX = x1;
        if (y1 < minY) minY = y1;
        if (x2 > maxX) maxX = x2;
        if (y2 > maxY) maxY = y2;
      }
    }

    return { minX, minY, width: maxX - minX, height: maxY - minY };
  }
}

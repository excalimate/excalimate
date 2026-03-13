/**
 * Canvas-based animation renderer using Excalidraw's native rendering pipeline.
 * Produces Excalidraw-quality output at interactive framerates.
 *
 * Strategy for performance:
 * - exportToCanvas renders a full scene (~5-20ms for typical scenes)
 * - For translate/rotate only (no geometry change), we reuse the last render
 *   and apply canvas context transforms — this is sub-millisecond
 * - Full re-render only when scale/opacity/drawProgress change
 * - Throttled to 30fps max for re-renders, 60fps for transform-only updates
 */

import { exportToCanvas, getNonDeletedElements } from '@excalidraw/excalidraw';
import type { ExcalidrawElement, NonDeletedExcalidrawElement } from '@excalidraw/excalidraw/element/types';
import type { ExcalidrawSceneData, AnimatableTarget } from '../../types/excalidraw';
import type { FrameState } from '../../types/animation';
import { CAMERA_FRAME_TARGET_ID } from '../../stores/projectStore';
import { applyAnimationToElements } from './renderUtils';

export interface SceneRenderResult {
  canvas: HTMLCanvasElement;
  /** Scene bounding box in element coordinates */
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
}

export class CanvasRenderer {
  private _lastElements: NonDeletedExcalidrawElement[] = [];
  private _lastFiles: Record<string, any> = {};
  private _cachedRender: SceneRenderResult | null = null;
  private _lastGeometryHash: string = '';
  private _rendering = false;
  private _pendingRender = false;

  /**
   * Render the scene with animation applied.
   * Returns a canvas containing the rendered scene.
   *
   * Fast path: if only translate/rotate changed (no geometry change),
   * returns the cached render. The caller applies canvas transforms.
   *
   * Slow path: if scale/opacity/drawProgress changed, re-renders via exportToCanvas.
   */
  async render(
    scene: ExcalidrawSceneData,
    frameState: FrameState,
    targets: AnimatableTarget[],
  ): Promise<SceneRenderResult | null> {
    const elements = getNonDeletedElements(
      scene.elements as ExcalidrawElement[],
    ) as NonDeletedExcalidrawElement[];

    if (elements.length === 0) return null;

    // Apply animation to element clones
    const animated = applyAnimationToElements(elements, frameState, targets);

    // Compute geometry hash (scale, width, height, opacity, drawProgress)
    // If only translate/rotate changed, we can skip re-render
    const geoHash = this._computeGeometryHash(animated, frameState);

    if (geoHash === this._lastGeometryHash && this._cachedRender) {
      // Fast path — geometry unchanged, reuse cached render
      return this._cachedRender;
    }

    // Slow path — need to re-render
    if (this._rendering) {
      this._pendingRender = true;
      return this._cachedRender; // return stale cache while waiting
    }

    this._rendering = true;
    try {
      const canvas = await exportToCanvas({
        elements: animated,
        files: scene.files ?? {},
        appState: { exportBackground: true },
        exportPadding: 0,
      });

      // Compute bounds
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const el of animated) {
        minX = Math.min(minX, (el as any).x);
        minY = Math.min(minY, (el as any).y);
        maxX = Math.max(maxX, (el as any).x + (el as any).width);
        maxY = Math.max(maxY, (el as any).y + (el as any).height);
      }

      this._cachedRender = { canvas, bounds: { minX, minY, maxX, maxY } };
      this._lastGeometryHash = geoHash;
      this._lastElements = elements;
      this._lastFiles = scene.files ?? {};
    } finally {
      this._rendering = false;
    }

    // If a render was requested while we were busy, do it now
    if (this._pendingRender) {
      this._pendingRender = false;
      // Will be picked up on next call
    }

    return this._cachedRender;
  }

  /**
   * Compute a hash of geometry-affecting properties.
   * translate and rotate don't affect geometry — they're handled by canvas transforms.
   */
  private _computeGeometryHash(
    elements: ExcalidrawElement[],
    frameState: FrameState,
  ): string {
    // Include element dimensions, opacity, and drawProgress
    const parts: string[] = [];
    for (const el of elements) {
      const e = el as any;
      parts.push(`${e.id}:${e.width?.toFixed(1)}:${e.height?.toFixed(1)}:${e.opacity}:${e.angle?.toFixed(3)}`);
    }
    // Include drawProgress from frameState
    for (const [id, state] of frameState) {
      if (id === CAMERA_FRAME_TARGET_ID) continue;
      if (state.drawProgress !== 1) {
        parts.push(`dp:${id}:${state.drawProgress.toFixed(3)}`);
      }
    }
    return parts.join('|');
  }

  invalidateCache(): void {
    this._lastGeometryHash = '';
    this._cachedRender = null;
  }
}

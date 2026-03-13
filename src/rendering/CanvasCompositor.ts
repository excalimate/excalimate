import type { FrameState, ElementAnimationState } from '../types/animation';
import type { Sprite } from './SpriteManager';
import { degreesToRadians } from '../core/utils/math';

/**
 * Renders animation frames by compositing pre-rendered {@link Sprite}s onto a
 * `<canvas>` element with per-element transforms driven by animation state.
 *
 * ### Performance optimisations
 *
 * - **DPR-aware rendering** – The canvas backing store is scaled to
 *   `window.devicePixelRatio` so artwork is crisp on high-DPI displays
 *   without doubling draw calls.
 *
 * - **Single RAF loop** – All sprite compositing happens inside one
 *   `renderFrame()` call per animation tick, avoiding layout thrashing
 *   from multiple canvas writes.
 *
 * - **Per-element sprite caching** – Element bitmaps are pre-rendered by
 *   `SpriteManager` and reused across frames. Only the affine transform
 *   per sprite changes each frame, keeping the per-frame cost to a
 *   handful of `drawImage` calls.
 *
 * - **Context save/restore batching** – A single `ctx.save()/restore()`
 *   pair wraps the entire frame, with per-sprite saves only when
 *   transforms are applied. This minimises canvas state-machine overhead.
 */
export class CanvasCompositor {
  private _canvas: HTMLCanvasElement;
  private _ctx: CanvasRenderingContext2D;
  private _width: number = 0;
  private _height: number = 0;
  private _dpr: number = 1;
  private _backgroundColor: string = '#ffffff';

  constructor(canvas: HTMLCanvasElement) {
    this._canvas = canvas;
    this._ctx = canvas.getContext('2d', { alpha: false })!;
    this._dpr = window.devicePixelRatio || 1;
    this.resize(canvas.clientWidth, canvas.clientHeight);
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Render a complete animation frame.
   *
   * @param sprites - All element sprites sorted by z-index.
   * @param frameState - Current animation state for each element.
   * @param viewportTransform - Optional viewport pan/zoom transform.
   */
  renderFrame(
    sprites: Sprite[],
    frameState: FrameState,
    viewportTransform?: { offsetX: number; offsetY: number; scale: number },
  ): void {
    const ctx = this._ctx;

    // Clear canvas & fill background
    ctx.save();
    ctx.setTransform(this._dpr, 0, 0, this._dpr, 0, 0);
    ctx.fillStyle = this._backgroundColor;
    ctx.fillRect(0, 0, this._width, this._height);

    // Apply viewport transform
    if (viewportTransform) {
      ctx.translate(viewportTransform.offsetX, viewportTransform.offsetY);
      ctx.scale(viewportTransform.scale, viewportTransform.scale);
    }

    // Render each sprite with its animation state
    for (const sprite of sprites) {
      const state = frameState.get(sprite.id);
      this._renderSprite(ctx, sprite, state);
    }

    ctx.restore();
  }

  /** Resize canvas to new dimensions, accounting for device pixel ratio. */
  resize(width: number, height: number): void {
    this._width = width;
    this._height = height;
    this._dpr = window.devicePixelRatio || 1;
    this._canvas.width = width * this._dpr;
    this._canvas.height = height * this._dpr;
    this._canvas.style.width = `${width}px`;
    this._canvas.style.height = `${height}px`;
  }

  /** Set the background fill colour used when clearing each frame. */
  setBackgroundColor(color: string): void {
    this._backgroundColor = color;
  }

  /** Clear the canvas (transparent). */
  clear(): void {
    this._ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);
  }

  /** Logical width (CSS pixels). */
  get width(): number {
    return this._width;
  }

  /** Logical height (CSS pixels). */
  get height(): number {
    return this._height;
  }

  // ---------------------------------------------------------------------------
  // Internals
  // ---------------------------------------------------------------------------

  private _renderSprite(
    ctx: CanvasRenderingContext2D,
    sprite: Sprite,
    state?: ElementAnimationState,
  ): void {
    const { bounds, bitmap } = sprite;

    // Animation values (fall back to identity when no state exists).
    const opacity = state?.opacity ?? 1;
    const translateX = state?.translateX ?? 0;
    const translateY = state?.translateY ?? 0;
    const scaleX = state?.scaleX ?? 1;
    const scaleY = state?.scaleY ?? 1;
    const rotation = state?.rotation ?? 0;

    // Skip fully transparent elements.
    if (opacity <= 0) return;

    ctx.save();

    // Transform around the element's visual centre.
    const cx = bounds.centerX + translateX;
    const cy = bounds.centerY + translateY;

    ctx.translate(cx, cy);
    ctx.rotate(degreesToRadians(rotation));
    ctx.scale(scaleX, scaleY);
    ctx.globalAlpha = opacity;

    // Draw bitmap centred at the transformed origin.
    const drawX = -bounds.width / 2;
    const drawY = -bounds.height / 2;
    ctx.drawImage(bitmap, drawX, drawY, bounds.width, bounds.height);

    ctx.restore();
  }
}

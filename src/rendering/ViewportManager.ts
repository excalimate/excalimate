import { clamp } from '../core/utils/math';

export interface ViewportState {
  offsetX: number;
  offsetY: number;
  scale: number;
}

/**
 * Manages the canvas viewport: pan, zoom, and coordinate transforms between
 * screen (CSS-pixel) space and scene (Excalidraw world) space.
 */
export class ViewportManager {
  private _offsetX: number = 0;
  private _offsetY: number = 0;
  private _scale: number = 1;
  private _minScale: number = 0.1;
  private _maxScale: number = 10;
  private _canvasWidth: number = 0;
  private _canvasHeight: number = 0;

  // ---------------------------------------------------------------------------
  // Coordinate conversions
  // ---------------------------------------------------------------------------

  /** Convert screen (CSS-pixel) coordinates to scene coordinates. */
  screenToScene(screenX: number, screenY: number): { x: number; y: number } {
    return {
      x: (screenX - this._offsetX) / this._scale,
      y: (screenY - this._offsetY) / this._scale,
    };
  }

  /** Convert scene coordinates to screen (CSS-pixel) coordinates. */
  sceneToScreen(sceneX: number, sceneY: number): { x: number; y: number } {
    return {
      x: sceneX * this._scale + this._offsetX,
      y: sceneY * this._scale + this._offsetY,
    };
  }

  // ---------------------------------------------------------------------------
  // Viewport manipulation
  // ---------------------------------------------------------------------------

  /**
   * Zoom by a multiplicative `factor` centred on a point in screen space.
   *
   * The point under (`centerX`, `centerY`) stays fixed on screen.
   * Defaults to the canvas centre when no centre is given.
   */
  zoom(factor: number, centerX?: number, centerY?: number): void {
    const cx = centerX ?? this._canvasWidth / 2;
    const cy = centerY ?? this._canvasHeight / 2;

    const newScale = clamp(this._scale * factor, this._minScale, this._maxScale);
    const effectiveFactor = newScale / this._scale;

    // Adjust offset so the scene point under (cx, cy) stays put.
    this._offsetX = cx - (cx - this._offsetX) * effectiveFactor;
    this._offsetY = cy - (cy - this._offsetY) * effectiveFactor;
    this._scale = newScale;
  }

  /** Pan by delta pixels in screen space. */
  pan(deltaX: number, deltaY: number): void {
    this._offsetX += deltaX;
    this._offsetY += deltaY;
  }

  /**
   * Fit the given content bounding box into the viewport with optional padding
   * (in CSS pixels).  The content is centred and the scale is chosen so it
   * fills the viewport without exceeding it.
   */
  fitToContent(
    contentBounds: { x: number; y: number; width: number; height: number },
    padding: number = 40,
  ): void {
    if (contentBounds.width <= 0 || contentBounds.height <= 0) {
      this.reset();
      return;
    }

    const availableWidth = Math.max(1, this._canvasWidth - padding * 2);
    const availableHeight = Math.max(1, this._canvasHeight - padding * 2);

    const scaleX = availableWidth / contentBounds.width;
    const scaleY = availableHeight / contentBounds.height;
    this._scale = clamp(Math.min(scaleX, scaleY), this._minScale, this._maxScale);

    // Centre the content.
    const contentCenterX = contentBounds.x + contentBounds.width / 2;
    const contentCenterY = contentBounds.y + contentBounds.height / 2;
    this._offsetX = this._canvasWidth / 2 - contentCenterX * this._scale;
    this._offsetY = this._canvasHeight / 2 - contentCenterY * this._scale;
  }

  /** Reset viewport to default (no pan, scale = 1). */
  reset(): void {
    this._offsetX = 0;
    this._offsetY = 0;
    this._scale = 1;
  }

  // ---------------------------------------------------------------------------
  // Configuration
  // ---------------------------------------------------------------------------

  /** Update the canvas dimensions (call on resize). */
  setCanvasSize(width: number, height: number): void {
    this._canvasWidth = width;
    this._canvasHeight = height;
  }

  /** Set the allowed zoom range. */
  setScaleLimits(min: number, max: number): void {
    this._minScale = min;
    this._maxScale = max;
    this._scale = clamp(this._scale, this._minScale, this._maxScale);
  }

  // ---------------------------------------------------------------------------
  // Accessors
  // ---------------------------------------------------------------------------

  /** Current viewport state suitable for passing to the compositor. */
  getViewportState(): ViewportState {
    return {
      offsetX: this._offsetX,
      offsetY: this._offsetY,
      scale: this._scale,
    };
  }
}

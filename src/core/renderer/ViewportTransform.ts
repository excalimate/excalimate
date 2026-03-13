/**
 * ViewportTransform — Scene ↔ Screen coordinate conversion.
 *
 * The viewport defines how the infinite scene canvas maps to the finite
 * screen area. It supports panning (translation) and zooming (uniform scale).
 *
 * Scene coordinates: The coordinate space of Excalidraw elements (x, y, width, height).
 * Screen coordinates: Pixel positions relative to the container element.
 *
 * Transform: screenPos = scenePos * zoom + pan
 * Inverse:   scenePos = (screenPos - pan) / zoom
 */

export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ViewportState {
  /** Horizontal pan offset in screen pixels */
  panX: number;
  /** Vertical pan offset in screen pixels */
  panY: number;
  /** Zoom level (1 = 100%, 2 = 200%, etc.) */
  zoom: number;
}

export const DEFAULT_VIEWPORT: ViewportState = {
  panX: 0,
  panY: 0,
  zoom: 1,
};

export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 10;
const ZOOM_STEP = 0.08; // 8% per scroll tick

export class ViewportTransform {
  private _state: ViewportState;

  constructor(initial: ViewportState = DEFAULT_VIEWPORT) {
    this._state = { ...initial };
  }

  get state(): ViewportState {
    return this._state;
  }

  setState(state: ViewportState): void {
    this._state = { ...state };
  }

  // ── Coordinate Conversion ──────────────────────────────────────────

  /** Convert a point from scene space to screen space. */
  sceneToScreen(point: Point): Point {
    return {
      x: point.x * this._state.zoom + this._state.panX,
      y: point.y * this._state.zoom + this._state.panY,
    };
  }

  /** Convert a point from screen space to scene space. */
  screenToScene(point: Point): Point {
    return {
      x: (point.x - this._state.panX) / this._state.zoom,
      y: (point.y - this._state.panY) / this._state.zoom,
    };
  }

  /** Convert a rectangle from scene space to screen space. */
  sceneRectToScreen(rect: Rect): Rect {
    const topLeft = this.sceneToScreen({ x: rect.x, y: rect.y });
    return {
      x: topLeft.x,
      y: topLeft.y,
      width: rect.width * this._state.zoom,
      height: rect.height * this._state.zoom,
    };
  }

  /** Convert a rectangle from screen space to scene space. */
  screenRectToScene(rect: Rect): Rect {
    const topLeft = this.screenToScene({ x: rect.x, y: rect.y });
    return {
      x: topLeft.x,
      y: topLeft.y,
      width: rect.width / this._state.zoom,
      height: rect.height / this._state.zoom,
    };
  }

  /** Convert a distance in screen pixels to scene units. */
  screenDistanceToScene(distance: number): number {
    return distance / this._state.zoom;
  }

  /** Convert a distance in scene units to screen pixels. */
  sceneDistanceToScreen(distance: number): number {
    return distance * this._state.zoom;
  }

  // ── Canvas Context Application ─────────────────────────────────────

  /** Apply viewport transform to a Canvas2D context. */
  applyToContext(ctx: CanvasRenderingContext2D): void {
    ctx.setTransform(
      this._state.zoom, 0,
      0, this._state.zoom,
      this._state.panX,
      this._state.panY,
    );
  }

  // ── Zoom Operations ────────────────────────────────────────────────

  /**
   * Zoom toward a specific screen-space point (e.g., cursor position).
   * Returns the new viewport state.
   */
  zoomAtPoint(screenPoint: Point, direction: 'in' | 'out'): ViewportState {
    const factor = direction === 'in' ? (1 + ZOOM_STEP) : (1 - ZOOM_STEP);
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, this._state.zoom * factor));
    const scale = newZoom / this._state.zoom;

    this._state = {
      zoom: newZoom,
      panX: screenPoint.x - (screenPoint.x - this._state.panX) * scale,
      panY: screenPoint.y - (screenPoint.y - this._state.panY) * scale,
    };

    return this._state;
  }

  /**
   * Set zoom to a specific level, centered on screen point.
   */
  setZoomAtPoint(newZoom: number, screenPoint: Point): ViewportState {
    const clamped = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom));
    const scale = clamped / this._state.zoom;

    this._state = {
      zoom: clamped,
      panX: screenPoint.x - (screenPoint.x - this._state.panX) * scale,
      panY: screenPoint.y - (screenPoint.y - this._state.panY) * scale,
    };

    return this._state;
  }

  // ── Pan Operations ─────────────────────────────────────────────────

  /** Pan by a screen-space delta. */
  pan(dx: number, dy: number): ViewportState {
    this._state = {
      ...this._state,
      panX: this._state.panX + dx,
      panY: this._state.panY + dy,
    };
    return this._state;
  }

  /** Set pan position directly. */
  setPan(panX: number, panY: number): ViewportState {
    this._state = { ...this._state, panX, panY };
    return this._state;
  }

  // ── Fit-to-Rect ────────────────────────────────────────────────────

  /**
   * Compute a viewport state that fits the given scene-space rect
   * into the given container size with optional padding.
   */
  static fitToRect(
    sceneRect: Rect,
    containerWidth: number,
    containerHeight: number,
    padding = 40,
  ): ViewportState {
    if (sceneRect.width <= 0 || sceneRect.height <= 0) {
      return DEFAULT_VIEWPORT;
    }

    const availW = containerWidth - padding * 2;
    const availH = containerHeight - padding * 2;
    const zoom = Math.min(
      availW / sceneRect.width,
      availH / sceneRect.height,
      MAX_ZOOM,
    );

    const panX = (containerWidth - sceneRect.width * zoom) / 2 - sceneRect.x * zoom;
    const panY = (containerHeight - sceneRect.height * zoom) / 2 - sceneRect.y * zoom;

    return { panX, panY, zoom: Math.max(MIN_ZOOM, zoom) };
  }
}

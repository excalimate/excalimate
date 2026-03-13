import type { Bounds } from '../types/excalidraw';

export interface Sprite {
  id: string;
  bitmap: ImageBitmap | HTMLImageElement;
  bounds: Bounds;
  zIndex: number;
}

interface MinimalElement {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  angle: number;
}

/** Padding added around each sprite to avoid clipping strokes/shadows. */
const SPRITE_PADDING = 4;

/**
 * Manages pre-rendered element bitmaps for efficient animation compositing.
 *
 * Excalidraw elements are rasterised once (via SVG → bitmap) and cached as
 * {@link Sprite} instances.  The compositor can then draw them each frame with
 * only a `drawImage` call per element instead of a full SVG render.
 */
export class SpriteManager {
  private _sprites: Map<string, Sprite> = new Map();
  private _pendingRenders: Map<string, Promise<Sprite>> = new Map();

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Pre-render a single Excalidraw element to an offscreen bitmap.
   *
   * The caller supplies the `<g>` (or `<use>`) element that `exportToSvg`
   * produced for this element together with the element metadata so we can
   * compute correct bounds.
   */
  async prerenderElement(
    element: MinimalElement,
    svgElement: SVGGElement,
    zIndex: number,
  ): Promise<Sprite> {
    const existing = this._pendingRenders.get(element.id);
    if (existing) return existing;

    const promise = this._renderSvgNodeToBitmap(
      svgElement,
      element,
      zIndex,
    );

    this._pendingRenders.set(element.id, promise);

    try {
      const sprite = await promise;
      this._sprites.set(element.id, sprite);
      return sprite;
    } finally {
      this._pendingRenders.delete(element.id);
    }
  }

  /**
   * Pre-render all elements from an SVG exported by Excalidraw.
   *
   * `exportToSvg` produces direct child `<g>` / `<use>` nodes in the same
   * order as the `elements` array.  We walk both in parallel to build one
   * {@link Sprite} per element.
   */
  async prerenderFromSvg(
    svg: SVGSVGElement,
    elements: ReadonlyArray<MinimalElement>,
  ): Promise<void> {
    // Collect the meaningful children – skip <defs>, <style>, whitespace text
    const children = Array.from(svg.children).filter(
      (child): child is SVGGElement | SVGUseElement =>
        child.tagName === 'g' || child.tagName === 'use',
    );

    const tasks: Promise<Sprite>[] = [];

    for (let i = 0; i < elements.length; i++) {
      const child = children[i];
      if (!child) continue;

      const el = elements[i];
      tasks.push(
        this.prerenderElement(el, child as SVGGElement, i),
      );
    }

    await Promise.all(tasks);
  }

  /** Get a cached sprite by element ID. */
  getSprite(id: string): Sprite | undefined {
    return this._sprites.get(id);
  }

  /** Get all sprites sorted by ascending z-index. */
  getAllSprites(): Sprite[] {
    return Array.from(this._sprites.values()).sort(
      (a, b) => a.zIndex - b.zIndex,
    );
  }

  /** Invalidate a specific sprite so it will be re-rendered on next request. */
  invalidate(id: string): void {
    this._sprites.delete(id);
    this._pendingRenders.delete(id);
  }

  /** Clear all cached sprites and release bitmap resources. */
  clear(): void {
    for (const sprite of this._sprites.values()) {
      if ('close' in sprite.bitmap && typeof sprite.bitmap.close === 'function') {
        (sprite.bitmap as ImageBitmap).close();
      }
    }
    this._sprites.clear();
    this._pendingRenders.clear();
  }

  /** `true` when there are no outstanding render promises. */
  get isReady(): boolean {
    return this._pendingRenders.size === 0;
  }

  // ---------------------------------------------------------------------------
  // Internals
  // ---------------------------------------------------------------------------

  /**
   * Serialise a single SVG node into a standalone SVG document, rasterise it
   * to a bitmap and return a {@link Sprite}.
   */
  private async _renderSvgNodeToBitmap(
    node: SVGGElement | SVGUseElement,
    element: MinimalElement,
    zIndex: number,
  ): Promise<Sprite> {
    const bounds = this._computeBounds(element);

    // Build a minimal SVG wrapping just this element's node.
    const paddedWidth = bounds.width + SPRITE_PADDING * 2;
    const paddedHeight = bounds.height + SPRITE_PADDING * 2;

    const svgNs = 'http://www.w3.org/2000/svg';
    const wrapperSvg = document.createElementNS(svgNs, 'svg');
    wrapperSvg.setAttribute('xmlns', svgNs);
    wrapperSvg.setAttribute('width', String(paddedWidth));
    wrapperSvg.setAttribute('height', String(paddedHeight));
    wrapperSvg.setAttribute(
      'viewBox',
      `${element.x - SPRITE_PADDING} ${element.y - SPRITE_PADDING} ${paddedWidth} ${paddedHeight}`,
    );

    // Copy <defs> from the parent SVG if available (fonts / patterns / clips)
    const parentSvg = node.closest('svg');
    if (parentSvg) {
      const defs = parentSvg.querySelector('defs');
      if (defs) {
        wrapperSvg.appendChild(defs.cloneNode(true));
      }
      const styles = parentSvg.querySelectorAll('style');
      styles.forEach((style) => wrapperSvg.appendChild(style.cloneNode(true)));
    }

    wrapperSvg.appendChild(node.cloneNode(true));

    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(wrapperSvg);
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    try {
      const bitmap = await this._loadImageAsBitmap(url, paddedWidth, paddedHeight);
      return { id: element.id, bitmap, bounds, zIndex };
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  /**
   * Load a blob URL into an Image then, where supported, convert to an
   * `ImageBitmap` for faster `drawImage` calls.  Falls back to the
   * `HTMLImageElement` on older browsers.
   */
  private async _loadImageAsBitmap(
    url: string,
    width: number,
    height: number,
  ): Promise<ImageBitmap | HTMLImageElement> {
    const img = new Image();
    img.width = width;
    img.height = height;

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = (_e) => reject(new Error('Failed to load sprite image'));
      img.src = url;
    });

    if (typeof createImageBitmap === 'function') {
      try {
        return await createImageBitmap(img);
      } catch {
        // Fall back to the raw image on failure (e.g. tainted canvas).
        return img;
      }
    }

    return img;
  }

  /** Compute a {@link Bounds} from an element's positional data. */
  private _computeBounds(element: MinimalElement): Bounds {
    return {
      x: element.x,
      y: element.y,
      width: element.width,
      height: element.height,
      centerX: element.x + element.width / 2,
      centerY: element.y + element.height / 2,
    };
  }
}

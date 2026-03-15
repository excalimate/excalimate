import type { NonDeletedExcalidrawElement } from '@excalidraw/excalidraw/element/types';
import type { Bounds } from '../../types/excalidraw';

/**
 * Compute bounds for an Excalidraw element.
 * For arrows/lines, bounds are computed from the points array (authoritative source).
 * For bound text on arrows, computes position from the arrow's midpoint
 * (since Excalidraw positions bound text dynamically and stored x/y may be stale).
 * For other shapes, uses x/y/width/height directly.
 */
export function computeBounds(
  element: NonDeletedExcalidrawElement,
  elementById?: Map<string, NonDeletedExcalidrawElement>,
): Bounds {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const elAny = element as any;

  // For bound text elements, compute position from the container's geometry
  // because Excalidraw positions bound text dynamically and stored x/y can be stale/zero
  if (element.type === 'text' && elAny.containerId && elementById) {
    const container = elementById.get(elAny.containerId);
    if (container) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const containerAny = container as any;
      // Get the container's visual center
      let cx: number, cy: number;
      if (
        containerAny.points &&
        Array.isArray(containerAny.points) &&
        containerAny.points.length >= 2
      ) {
        // Arrow/line: compute midpoint of the path
        const points = containerAny.points as number[][];
        const midIdx = Math.floor(points.length / 2);
        if (points.length % 2 === 0) {
          // Even number of points: average the two middle points
          const p1 = points[midIdx - 1];
          const p2 = points[midIdx];
          cx = container.x + (p1[0] + p2[0]) / 2;
          cy = container.y + (p1[1] + p2[1]) / 2;
        } else {
          // Odd number: use the middle point
          cx = container.x + points[midIdx][0];
          cy = container.y + points[midIdx][1];
        }
      } else {
        // Shape: use center
        cx = container.x + container.width / 2;
        cy = container.y + container.height / 2;
      }

      // Use the text's own width/height if valid, otherwise estimate
      const tw = element.width > 0 ? element.width : 80;
      const th = element.height > 0 ? element.height : 20;
      return {
        x: cx - tw / 2,
        y: cy - th / 2,
        width: tw,
        height: th,
        centerX: cx,
        centerY: cy,
      };
    }
  }

  // For linear elements (arrows, lines, freedraw), compute from points
  if (elAny.points && Array.isArray(elAny.points) && elAny.points.length > 0) {
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (const [px, py] of elAny.points as number[][]) {
      const ax = element.x + px;
      const ay = element.y + py;
      if (ax < minX) minX = ax;
      if (ay < minY) minY = ay;
      if (ax > maxX) maxX = ax;
      if (ay > maxY) maxY = ay;
    }

    // Account for stroke width, arrowhead tips, and bezier curve bulge
    const strokeWidth = elAny.strokeWidth ?? 1;
    const pad = strokeWidth / 2 + (element.type === 'arrow' ? 8 : 3);
    minX -= pad;
    minY -= pad;
    maxX += pad;
    maxY += pad;

    const w = maxX - minX;
    const h = maxY - minY;
    return {
      x: minX,
      y: minY,
      width: Math.max(w, 1),
      height: Math.max(h, 1),
      centerX: minX + w / 2,
      centerY: minY + h / 2,
    };
  }

  // For rectangles, ellipses, text, etc. — handle potential negative dims
  const minX = Math.min(element.x, element.x + element.width);
  const minY = Math.min(element.y, element.y + element.height);
  const w = Math.abs(element.width);
  const h = Math.abs(element.height);
  return {
    x: minX,
    y: minY,
    width: w,
    height: h,
    centerX: minX + w / 2,
    centerY: minY + h / 2,
  };
}

/**
 * Compute the visual extent of an element, handling points and negative dimensions.
 * Returns [minX, minY, maxX, maxY].
 */
export function elementExtent(el: {
  x: number;
  y: number;
  width: number;
  height: number;
  points?: readonly (readonly number[])[];
}): [number, number, number, number] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const elAny = el as any;
  if (elAny.points && Array.isArray(elAny.points) && elAny.points.length > 0) {
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (const [px, py] of elAny.points as number[][]) {
      const ax = el.x + px;
      const ay = el.y + py;
      if (ax < minX) minX = ax;
      if (ay < minY) minY = ay;
      if (ax > maxX) maxX = ax;
      if (ay > maxY) maxY = ay;
    }
    return [minX, minY, maxX, maxY];
  }
  const x1 = Math.min(el.x, el.x + el.width);
  const y1 = Math.min(el.y, el.y + el.height);
  const x2 = Math.max(el.x, el.x + el.width);
  const y2 = Math.max(el.y, el.y + el.height);
  return [x1, y1, x2, y2];
}

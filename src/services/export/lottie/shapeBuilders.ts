/**
 * Convert Excalidraw shapes to Lottie shape items.
 */
import type {
  LottieShapeItem, LottieRect, LottieEllipse, LottiePath,
  LottieFill, LottieStroke, LottieShapeTransform, LottieShapeGroup,
} from './types';
import { staticVal, staticMulti } from './types';
import { hexToLottie, isTransparent } from './colorUtils';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ExcalElement = Record<string, any>;

/** Build a Lottie shape group for a rectangle element. */
export function buildRectShapes(el: ExcalElement, sx = 1, sy = 1): LottieShapeGroup {
  const w = Math.abs(el.width ?? 100) * sx;
  const h = Math.abs(el.height ?? 100) * sy;
  const items: LottieShapeItem[] = [];

  const rect: LottieRect = {
    ty: 'rc',
    nm: 'Rect',
    p: staticMulti([0, 0]),
    s: staticMulti([w, h]),
    r: staticVal(el.roundness?.value ?? 0),
  };
  items.push(rect);
  items.push(...buildFillStroke(el, sx));
  items.push(shapeTransform());

  return { ty: 'gr', nm: el.id, it: items };
}

/** Build a Lottie shape group for an ellipse element. */
export function buildEllipseShapes(el: ExcalElement, sx = 1, sy = 1): LottieShapeGroup {
  const w = Math.abs(el.width ?? 100) * sx;
  const h = Math.abs(el.height ?? 100) * sy;
  const items: LottieShapeItem[] = [];

  const ellipse: LottieEllipse = {
    ty: 'el',
    nm: 'Ellipse',
    p: staticMulti([0, 0]),
    s: staticMulti([w, h]),
  };
  items.push(ellipse);
  items.push(...buildFillStroke(el, sx));
  items.push(shapeTransform());

  return { ty: 'gr', nm: el.id, it: items };
}

/** Build a Lottie shape group for a diamond (rotated square path). */
export function buildDiamondShapes(el: ExcalElement, sx = 1, sy = 1): LottieShapeGroup {
  const w = Math.abs(el.width ?? 100) / 2 * sx;
  const h = Math.abs(el.height ?? 100) / 2 * sy;
  const items: LottieShapeItem[] = [];

  const path: LottiePath = {
    ty: 'sh',
    nm: 'Diamond',
    ks: {
      a: 0,
      k: {
        c: true,
        v: [[0, -h], [w, 0], [0, h], [-w, 0]],
        i: [[0, 0], [0, 0], [0, 0], [0, 0]],
        o: [[0, 0], [0, 0], [0, 0], [0, 0]],
      },
    },
  };
  items.push(path);
  items.push(...buildFillStroke(el, sx));
  items.push(shapeTransform());

  return { ty: 'gr', nm: el.id, it: items };
}

/** Build a Lottie shape group for a line/arrow element. */
export function buildPathShapes(el: ExcalElement, sx = 1, sy = 1): LottieShapeGroup {
  const points: number[][] = el.points ?? [[0, 0], [el.width ?? 100, el.height ?? 0]];
  const items: LottieShapeItem[] = [];

  // Scale points to composition units (points are relative to element origin)
  const vertices = points.map(([px, py]: number[]) => [px * sx, py * sy]);
  const zeroTangents = points.map(() => [0, 0]);

  const path: LottiePath = {
    ty: 'sh',
    nm: 'Path',
    ks: {
      a: 0,
      k: {
        c: false,
        v: vertices,
        i: zeroTangents,
        o: zeroTangents,
      },
    },
  };
  items.push(path);

  // Arrows/lines only have stroke, no fill
  const strokeColor = hexToLottie(el.strokeColor ?? '#1e1e1e');
  const stroke: LottieStroke = {
    ty: 'st',
    nm: 'Stroke',
    c: staticMulti(strokeColor),
    o: staticVal(100),
    w: staticVal((el.strokeWidth ?? 2) * sx),
    lc: 2,
    lj: 2,
  };
  items.push(stroke);

  // Add arrowhead as a small path if endArrowhead is set
  if (el.endArrowhead === 'arrow' && vertices.length >= 2) {
    const last = vertices[vertices.length - 1];
    const prev = vertices[vertices.length - 2];
    const dx = last[0] - prev[0];
    const dy = last[1] - prev[1];
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const headLen = 12 * sx;

    const arrowPath: LottiePath = {
      ty: 'sh',
      nm: 'Arrowhead',
      ks: {
        a: 0,
        k: {
          c: false,
          v: [
            [last[0] - headLen * (ux - uy * 0.5), last[1] - headLen * (uy + ux * 0.5)],
            [last[0], last[1]],
            [last[0] - headLen * (ux + uy * 0.5), last[1] - headLen * (uy - ux * 0.5)],
          ],
          i: [[0, 0], [0, 0], [0, 0]],
          o: [[0, 0], [0, 0], [0, 0]],
        },
      },
    };
    items.push(arrowPath);
  }

  items.push(shapeTransform());
  return { ty: 'gr', nm: el.id, it: items };
}

// ── Helpers ─────────────────────────────────────────────────────

function buildFillStroke(el: ExcalElement, strokeScale = 1): LottieShapeItem[] {
  const items: LottieShapeItem[] = [];

  if (!isTransparent(el.backgroundColor)) {
    const bgColor = hexToLottie(el.backgroundColor);
    const fill: LottieFill = {
      ty: 'fl',
      nm: 'Fill',
      c: staticMulti(bgColor),
      o: staticVal(100),
      r: 1,
    };
    items.push(fill);
  }

  const strokeColor = hexToLottie(el.strokeColor ?? '#1e1e1e');
  const stroke: LottieStroke = {
    ty: 'st',
    nm: 'Stroke',
    c: staticMulti(strokeColor),
    o: staticVal(100),
    w: staticVal((el.strokeWidth ?? 2) * strokeScale),
    lc: 2,
    lj: 2,
  };
  items.push(stroke);

  return items;
}

function shapeTransform(): LottieShapeTransform {
  return {
    ty: 'tr',
    p: staticMulti([0, 0]),
    a: staticMulti([0, 0]),
    s: staticMulti([100, 100]),
    r: staticVal(0),
    o: staticVal(100),
  };
}

/**
 * Convert Excalidraw elements to Lottie shapes by rendering them through
 * Excalidraw's own SVG exporter. This captures the exact visual output
 * including roughjs hand-drawn strokes, arrowheads, and text rendering.
 */
import type {
  LottieShapeGroup, LottieShapeItem, LottiePath, LottieFill, LottieStroke,
  LottieShapeTransform,
} from './types';
import { staticVal, staticMulti } from './types';
import { hexToLottie } from './colorUtils';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ExcalElement = Record<string, any>;

// Cache the import so we don't re-import per element
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _exportToSvg: any = null;
async function getExportToSvg() {
  if (!_exportToSvg) {
    const mod = await import('@excalidraw/excalidraw');
    _exportToSvg = mod.exportToSvg;
  }
  return _exportToSvg;
}

export async function renderElementToSvg(
  el: ExcalElement,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  files: Record<string, any>,
): Promise<SVGSVGElement> {
  const exportToSvg = await getExportToSvg();
  return exportToSvg({
    elements: [el],
    files: files ?? {},
    appState: {
      exportBackground: false,
      viewBackgroundColor: 'transparent',
    },
    exportPadding: 0,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
}

export interface LottieImageDataAsset {
  dataUri: string;
  width: number;
  height: number;
}

function getSvgDimensions(
  svg: SVGSVGElement,
  el: ExcalElement,
  sx: number,
  sy: number,
): { width: number; height: number } {
  const vb = svg.viewBox?.baseVal;
  const baseWidth = Math.max(1, vb?.width ?? Math.abs(el.width ?? 1));
  const baseHeight = Math.max(1, vb?.height ?? Math.abs(el.height ?? 1));
  const width = Math.max(1, baseWidth * sx);
  const height = Math.max(1, baseHeight * sy);
  return { width, height };
}

function loadImageFromUrl(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to decode fallback image for Lottie export'));
    img.src = src;
  });
}

export async function elementToLottiePngImageAsset(
  el: ExcalElement,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  files: Record<string, any>,
  sx: number,
  sy: number,
  sourceSvg?: SVGSVGElement,
): Promise<LottieImageDataAsset> {
  const svg = sourceSvg ?? await renderElementToSvg(el, files);
  const { width, height } = getSvgDimensions(svg, el, sx, sy);
  const outWidth = Math.max(1, Math.round(width));
  const outHeight = Math.max(1, Math.round(height));
  const svgForRaster = svg.cloneNode(true) as SVGSVGElement;
  svgForRaster.setAttribute('width', String(outWidth));
  svgForRaster.setAttribute('height', String(outHeight));
  const serializedSvg = new XMLSerializer().serializeToString(svgForRaster);
  const svgBlob = new Blob([serializedSvg], { type: 'image/svg+xml;charset=utf-8' });
  const svgUrl = URL.createObjectURL(svgBlob);

  try {
    const image = await loadImageFromUrl(svgUrl);
    const canvas = document.createElement('canvas');
    canvas.width = outWidth;
    canvas.height = outHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to create canvas context for Lottie glyph export');
    }
    ctx.clearRect(0, 0, outWidth, outHeight);
    ctx.drawImage(image, 0, 0, outWidth, outHeight);
    return {
      dataUri: canvas.toDataURL('image/png'),
      width: outWidth,
      height: outHeight,
    };
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

/**
 * Render a single Excalidraw element to SVG, then extract paths as Lottie shapes.
 * The element is exported in isolation so we get only its paths.
 */
export async function elementToLottieShapes(
  el: ExcalElement,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  files: Record<string, any>,
  sx: number,
  sy: number,
  sourceSvg?: SVGSVGElement,
): Promise<LottieShapeGroup> {
  const svg = sourceSvg ?? await renderElementToSvg(el, files);

  const vb = svg.viewBox?.baseVal;

  // SVG viewBox is (0, 0, w, h) — paths are in element-local space.
  // Shapes (centered layers): offset by -w/2, -h/2 to center on layer anchor.
  // Arrows/lines (origin layers): no offset needed.
  const elType = el.type as string;
  const isLinear = elType === 'arrow' || elType === 'line';
  const offsetX = isLinear ? 0 : -(vb?.width ?? Math.abs(el.width ?? 0)) / 2;
  const offsetY = isLinear ? 0 : -(vb?.height ?? Math.abs(el.height ?? 0)) / 2;

  const items: LottieShapeItem[] = [];

  // Extract <path> elements
  for (const pathEl of svg.querySelectorAll('path')) {
    const d = pathEl.getAttribute('d');
    if (!d) continue;

    const vertices = parseSvgPathToLottie(d, offsetX, offsetY, sx, sy);
    if (!vertices) continue;

    items.push({ ty: 'sh', nm: 'Path', ks: { a: 0, k: vertices } } as LottiePath);

    // Each SVG path has its own fill/stroke attributes
    addFillStroke(items, pathEl, sx);
  }

  // Extract <line> elements (arrowheads)
  for (const lineEl of svg.querySelectorAll('line')) {
    const x1 = parseFloat(lineEl.getAttribute('x1') ?? '0');
    const y1 = parseFloat(lineEl.getAttribute('y1') ?? '0');
    const x2 = parseFloat(lineEl.getAttribute('x2') ?? '0');
    const y2 = parseFloat(lineEl.getAttribute('y2') ?? '0');

    items.push({
      ty: 'sh', nm: 'Line',
      ks: { a: 0, k: {
        c: false,
        v: [[(x1 + offsetX) * sx, (y1 + offsetY) * sy], [(x2 + offsetX) * sx, (y2 + offsetY) * sy]],
        i: [[0, 0], [0, 0]],
        o: [[0, 0], [0, 0]],
      }},
    } as LottiePath);

    addFillStroke(items, lineEl, sx);
  }

  items.push(identityTransform());
  return { ty: 'gr', nm: el.id, it: items };
}

/** Extract fill and stroke from an SVG element and add to Lottie shape items. */
function addFillStroke(items: LottieShapeItem[], svgEl: Element, strokeScale: number): void {
  const fill = svgEl.getAttribute('fill');
  if (fill && fill !== 'none' && fill !== 'transparent') {
    items.push({
      ty: 'fl', nm: 'Fill',
      c: staticMulti(hexToLottie(fill)),
      o: staticVal(100),
      r: 1,
    } as LottieFill);
  }

  const stroke = svgEl.getAttribute('stroke');
  if (stroke && stroke !== 'none') {
    items.push({
      ty: 'st', nm: 'Stroke',
      c: staticMulti(hexToLottie(stroke)),
      o: staticVal(100),
      w: staticVal(parseFloat(svgEl.getAttribute('stroke-width') ?? '2') * strokeScale),
      lc: 2,
      lj: 2,
    } as LottieStroke);
  }
}

function identityTransform(): LottieShapeTransform {
  return {
    ty: 'tr',
    p: staticMulti([0, 0]),
    a: staticMulti([0, 0]),
    s: staticMulti([100, 100]),
    r: staticVal(0),
    o: staticVal(100),
  };
}

/**
 * Parse an SVG path `d` attribute into Lottie path vertices.
 * Handles M, L, C, Q, Z commands (the ones roughjs generates).
 * Coordinates are transformed from SVG space to Lottie layer-local space.
 */
function parseSvgPathToLottie(
  d: string,
  offsetX: number,
  offsetY: number,
  sx: number,
  sy: number,
): { c: boolean; v: number[][]; i: number[][]; o: number[][] } | null {
  const vertices: number[][] = [];
  const inTangents: number[][] = [];
  const outTangents: number[][] = [];
  let closed = false;

  // Transform SVG element-local coordinate to Lottie layer-local coordinate.
  // offsetX/Y centers shapes on the anchor, or is 0 for arrows.
  const tx = (x: number) => (x + offsetX) * sx;
  const ty = (y: number) => (y + offsetY) * sy;

  // Tokenize the path data
  const tokens = d.match(/[MmLlCcQqZzHhVvSsAa]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g);
  if (!tokens) return null;

  let i = 0;
  let curX = 0, curY = 0;

  function num(): number {
    return parseFloat(tokens![i++]) || 0;
  }

  while (i < tokens.length) {
    const cmd = tokens[i];
    if (/[A-Za-z]/.test(cmd)) {
      i++; // consume command letter
    } else {
      break;
    }

    switch (cmd) {
      case 'M':
        curX = num(); curY = num();
        vertices.push([tx(curX), ty(curY)]);
        inTangents.push([0, 0]);
        outTangents.push([0, 0]);
        // Implicit lineTo after moveTo
        while (i < tokens.length && /[-+\d.]/.test(tokens[i])) {
          curX = num(); curY = num();
          vertices.push([tx(curX), ty(curY)]);
          inTangents.push([0, 0]);
          outTangents.push([0, 0]);
        }
        break;

      case 'm': {
        const dx = num(), dy = num();
        curX += dx; curY += dy;
        vertices.push([tx(curX), ty(curY)]);
        inTangents.push([0, 0]);
        outTangents.push([0, 0]);
        while (i < tokens.length && /[-+\d.]/.test(tokens[i])) {
          curX += num(); curY += num();
          vertices.push([tx(curX), ty(curY)]);
          inTangents.push([0, 0]);
          outTangents.push([0, 0]);
        }
        break;
      }

      case 'L':
        while (i < tokens.length && /[-+\d.]/.test(tokens[i])) {
          curX = num(); curY = num();
          vertices.push([tx(curX), ty(curY)]);
          inTangents.push([0, 0]);
          outTangents.push([0, 0]);
        }
        break;

      case 'l':
        while (i < tokens.length && /[-+\d.]/.test(tokens[i])) {
          curX += num(); curY += num();
          vertices.push([tx(curX), ty(curY)]);
          inTangents.push([0, 0]);
          outTangents.push([0, 0]);
        }
        break;

      case 'C':
        while (i < tokens.length && /[-+\d.]/.test(tokens[i])) {
          const cp1x = num(), cp1y = num();
          const cp2x = num(), cp2y = num();
          const ex = num(), ey = num();

          // Out-tangent on the previous vertex
          if (outTangents.length > 0) {
            const prevVert = vertices[vertices.length - 1];
            outTangents[outTangents.length - 1] = [
              tx(cp1x) - prevVert[0],
              ty(cp1y) - prevVert[1],
            ];
          }

          // New vertex with in-tangent
          const vx = tx(ex), vy = ty(ey);
          vertices.push([vx, vy]);
          inTangents.push([tx(cp2x) - vx, ty(cp2y) - vy]);
          outTangents.push([0, 0]);

          curX = ex; curY = ey;
        }
        break;

      case 'c':
        while (i < tokens.length && /[-+\d.]/.test(tokens[i])) {
          const dcp1x = num(), dcp1y = num();
          const dcp2x = num(), dcp2y = num();
          const dex = num(), dey = num();

          const cp1x = curX + dcp1x, cp1y = curY + dcp1y;
          const cp2x = curX + dcp2x, cp2y = curY + dcp2y;
          const ex = curX + dex, ey = curY + dey;

          if (outTangents.length > 0) {
            const prevVert = vertices[vertices.length - 1];
            outTangents[outTangents.length - 1] = [
              tx(cp1x) - prevVert[0],
              ty(cp1y) - prevVert[1],
            ];
          }

          const vx = tx(ex), vy = ty(ey);
          vertices.push([vx, vy]);
          inTangents.push([tx(cp2x) - vx, ty(cp2y) - vy]);
          outTangents.push([0, 0]);

          curX = ex; curY = ey;
        }
        break;

      case 'Q':
        // Quadratic bezier — convert to cubic approximation
        while (i < tokens.length && /[-+\d.]/.test(tokens[i])) {
          const qx = num(), qy = num();
          const ex = num(), ey = num();

          // Approximate Q with C: CP1 = P0 + 2/3*(Q-P0), CP2 = E + 2/3*(Q-E)
          const cp1x = curX + 2 / 3 * (qx - curX);
          const cp1y = curY + 2 / 3 * (qy - curY);
          const cp2x = ex + 2 / 3 * (qx - ex);
          const cp2y = ey + 2 / 3 * (qy - ey);

          if (outTangents.length > 0) {
            const prevVert = vertices[vertices.length - 1];
            outTangents[outTangents.length - 1] = [
              tx(cp1x) - prevVert[0],
              ty(cp1y) - prevVert[1],
            ];
          }

          const vx = tx(ex), vy = ty(ey);
          vertices.push([vx, vy]);
          inTangents.push([tx(cp2x) - vx, ty(cp2y) - vy]);
          outTangents.push([0, 0]);

          curX = ex; curY = ey;
        }
        break;

      case 'H':
        curX = num();
        vertices.push([tx(curX), ty(curY)]);
        inTangents.push([0, 0]);
        outTangents.push([0, 0]);
        break;

      case 'h':
        curX += num();
        vertices.push([tx(curX), ty(curY)]);
        inTangents.push([0, 0]);
        outTangents.push([0, 0]);
        break;

      case 'V':
        curY = num();
        vertices.push([tx(curX), ty(curY)]);
        inTangents.push([0, 0]);
        outTangents.push([0, 0]);
        break;

      case 'v':
        curY += num();
        vertices.push([tx(curX), ty(curY)]);
        inTangents.push([0, 0]);
        outTangents.push([0, 0]);
        break;

      case 'Z':
      case 'z':
        closed = true;
        break;

      default:
        // Skip unsupported commands (A/a arcs, S/s smooth curves)
        // Consume remaining numbers
        while (i < tokens.length && /[-+\d.]/.test(tokens[i])) num();
        break;
    }
  }

  if (vertices.length === 0) return null;

  return { c: closed, v: vertices, i: inTangents, o: outTangents };
}

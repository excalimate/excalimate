/**
 * Convert Excalidraw text elements to Lottie text layers.
 */
import type { LottieTextLayer, LottieTransform, LottieTextData } from './types';
import { staticVal, staticMulti, defaultTransform } from './types';
import { hexToLottie } from './colorUtils';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ExcalElement = Record<string, any>;

const FONT_MAP: Record<number, string> = {
  1: 'Virgil',
  2: 'Helvetica',
  3: 'Cascadia',
  4: 'Comic Sans MS',
  5: 'Liberation Sans',
};

const JUSTIFY_MAP: Record<string, number> = {
  left: 0,
  right: 1,
  center: 2,
};

export function buildTextLayer(
  el: ExcalElement,
  layerIndex: number,
  ip: number,
  op: number,
): LottieTextLayer {
  const text = el.text ?? '';
  const fontSize = el.fontSize ?? 20;
  const fontFamily = FONT_MAP[el.fontFamily as number] ?? 'Arial';
  const justify = JUSTIFY_MAP[el.textAlign as string] ?? 0;
  const fillColor = hexToLottie(el.strokeColor ?? '#1e1e1e');

  // Position: Lottie uses center, Excalidraw uses top-left
  const cx = (el.x ?? 0) + (el.width ?? 0) / 2;
  const cy = (el.y ?? 0) + (el.height ?? 0) / 2;

  const transform: LottieTransform = {
    ...defaultTransform(),
    p: staticMulti([cx, cy, 0]),
    o: staticVal((el.opacity ?? 100)),
    r: staticVal((el.angle ?? 0) * (180 / Math.PI)),
  };

  const textData: LottieTextData = {
    d: {
      k: [{
        s: {
          s: fontSize,
          f: fontFamily,
          t: text,
          j: justify,
          fc: fillColor,
          lh: fontSize * (el.lineHeight ?? 1.25),
        },
        t: 0,
      }],
    },
  };

  return {
    ty: 5,
    nm: el.id ?? 'text',
    ind: layerIndex,
    ip,
    op,
    st: 0,
    ks: transform,
    t: textData,
  };
}

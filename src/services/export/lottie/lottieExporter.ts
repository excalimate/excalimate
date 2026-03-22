/**
 * Lottie export — converts Excalimate scene + animation to Lottie JSON.
 *
 * Coordinate mapping:
 * - Excalidraw uses absolute scene coordinates (x, y from top-left)
 * - Lottie composition is sized to the camera frame
 * - All element positions are offset so camera center = composition center
 * - For shapes (rect, ellipse, diamond): position = element center
 * - For linear elements (arrow, line): position = element origin (x, y),
 *   and points are drawn relative to that origin
 */
import type {
  LottieAnimation,
  LottieFill,
  LottieFont,
  LottieImageAsset,
  LottieImageLayer,
  LottieLayer,
  LottieShapeLayer,
} from './types';
import { staticMulti, staticVal } from './types';
import { elementToLottiePngImageAsset, elementToLottieShapes, renderElementToSvg } from './svgToLottie';
import { groupTracksByProperty, buildTransform, buildTrimPath } from './keyframeConverter';
import { buildGroupLayers } from './groupHierarchy';
import { buildCameraLayer } from './cameraComposition';
import { hexToLottie } from './colorUtils';
import type { AnimatableTarget } from '../../../types/excalidraw';
import type { AnimationTrack } from '../../../types/animation';
import type { LottieFontEmbeddingMode } from '../types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ExcalElement = Record<string, any>;

const CAMERA_FRAME_ID = '__camera_frame__';
const EXCALIDRAW_VIRGIL_FONT_URL = 'https://esm.sh/@excalidraw/excalidraw@0.18.0/dist/prod/fonts/Virgil/Virgil-Regular.woff2';

type TextFontMeta = {
  fName: string;
  fFamily: string;
  fStyle?: string;
  fClass?: string;
  fWeight?: string;
  unitsPerEm: number;
  ascender: number;
  descender: number;
  defaultLineHeight: number;
  fontPath?: string;
};

const EXCALIDRAW_TEXT_FONTS: Record<number, TextFontMeta> = {
  // Excalimate uses Excalifont as the handwritten/default face.
  1: { fName: 'Virgil Regular', fFamily: 'Virgil', fStyle: 'Regular', unitsPerEm: 1000, ascender: 886, descender: -374, defaultLineHeight: 1.25, fontPath: EXCALIDRAW_VIRGIL_FONT_URL },
  2: { fName: 'Helvetica', fFamily: 'Helvetica', unitsPerEm: 2048, ascender: 1577, descender: -471, defaultLineHeight: 1.15 },
  3: { fName: 'Cascadia', fFamily: 'Cascadia', unitsPerEm: 2048, ascender: 1900, descender: -480, defaultLineHeight: 1.2 },
  5: { fName: 'Virgil Regular', fFamily: 'Virgil', fStyle: 'Regular', unitsPerEm: 1000, ascender: 886, descender: -374, defaultLineHeight: 1.25, fontPath: EXCALIDRAW_VIRGIL_FONT_URL },
  6: { fName: 'Nunito', fFamily: 'Nunito', unitsPerEm: 1000, ascender: 1011, descender: -353, defaultLineHeight: 1.35 },
  7: { fName: 'Lilita One', fFamily: 'Lilita One', unitsPerEm: 1000, ascender: 923, descender: -220, defaultLineHeight: 1.15 },
  8: { fName: 'Comic Shanns', fFamily: 'Comic Shanns', unitsPerEm: 1000, ascender: 750, descender: -250, defaultLineHeight: 1.25 },
  9: { fName: 'Liberation Sans', fFamily: 'Liberation Sans', unitsPerEm: 2048, ascender: 1854, descender: -434, defaultLineHeight: 1.15 },
};

const fontDataUriCache = new Map<string, string>();

function resolveTextFont(fontFamily: number | undefined): TextFontMeta {
  return EXCALIDRAW_TEXT_FONTS[fontFamily ?? -1] ?? EXCALIDRAW_TEXT_FONTS[5];
}

function toLottieTextJustify(textAlign: string | undefined): number {
  if (textAlign === 'right') return 1;
  if (textAlign === 'center') return 2;
  return 0;
}

function estimateTextBox(el: ExcalElement, sx: number, sy: number): { width: number; height: number } {
  const width = Math.max(1, Math.abs((el.width ?? 0) * sx));
  const lineCount = typeof el.text === 'string' ? Math.max(1, el.text.split('\n').length) : 1;
  const scaledFontSize = Math.max(1, (el.fontSize ?? 20) * ((sx + sy) / 2));
  const lineHeightRatio = typeof el.lineHeight === 'number' ? el.lineHeight : 1.25;
  const fallbackHeight = scaledFontSize * lineHeightRatio * lineCount;
  const height = Math.max(1, Math.abs((el.height ?? fallbackHeight / Math.max(sy, 0.0001)) * sy));
  return { width, height };
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

async function resolveFontPath(
  font: TextFontMeta,
  embedFontsAsDataUri: boolean,
): Promise<{ fPath?: string; origin?: number }> {
  if (!font.fontPath) return {};
  if (!embedFontsAsDataUri) {
    return { fPath: font.fontPath, origin: 3 };
  }
  const cached = fontDataUriCache.get(font.fontPath);
  if (cached) return { fPath: cached, origin: 3 };
  const response = await fetch(font.fontPath);
  if (!response.ok) {
    throw new Error(`Failed to load font for Lottie export: ${font.fontPath}`);
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  const dataUri = `data:font/woff2;base64,${bytesToBase64(bytes)}`;
  fontDataUriCache.set(font.fontPath, dataUri);
  return { fPath: dataUri, origin: 3 };
}

export interface LottieExportOptions {
  elements: ExcalElement[];
  targets: AnimatableTarget[];
  tracks: AnimationTrack[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  files: Record<string, any>;
  fps: number;
  clipStart: number;
  clipEnd: number;
  cameraFrame: { x: number; y: number; width: number; height: number };
  width: number;
  height: number;
  embedFontsAsDataUri?: boolean;
  fontEmbeddingModes?: LottieFontEmbeddingMode[];
}

/**
 * Compute the element's anchor position in scene coordinates.
 * - Shapes (rect, ellipse, diamond): center of the bounding box
 * - Linear elements (arrow, line): the element origin (x, y) — points are relative to this
 */
function getElementPosition(el: ExcalElement): { x: number; y: number } {
  const type = el.type as string;
  if (type === 'arrow' || type === 'line') {
    // For linear elements, Lottie layer position = element origin.
    // The path points are drawn relative to this origin.
    return { x: el.x ?? 0, y: el.y ?? 0 };
  }
  // For shapes and text: center of bounding box
  return {
    x: (el.x ?? 0) + (el.width ?? 0) / 2,
    y: (el.y ?? 0) + (el.height ?? 0) / 2,
  };
}

/**
 * Generate a complete Lottie animation JSON from Excalimate data.
 */
export async function generateLottie(options: LottieExportOptions): Promise<LottieAnimation> {
  const {
    elements,
    targets,
    tracks,
    files,
    fps,
    clipStart,
    clipEnd,
    cameraFrame,
    width,
    height,
    embedFontsAsDataUri = false,
    fontEmbeddingModes = ['inline'],
  } = options;

  const durationMs = clipEnd - clipStart;
  const totalFrames = Math.ceil((durationMs / 1000) * fps);
  const ip = 0;
  const op = totalFrames;

  // Lottie composition is sized to the output resolution (e.g. 1920×1080).
  // Scene coordinates are mapped to composition coordinates:
  //   compX = (sceneX - camLeft) / cameraWidth * outputWidth
  // This ensures the camera frame maps exactly to the full composition.
  const sx = width / cameraFrame.width;
  const sy = height / cameraFrame.height;
  const camLeft = cameraFrame.x - cameraFrame.width / 2;
  const camTop = cameraFrame.y - cameraFrame.height / 2;
  const effectiveFontEmbeddingModes = new Set<LottieFontEmbeddingMode>(
    fontEmbeddingModes.length > 0 ? fontEmbeddingModes : ['inline'],
  );
  const includeInlineTextFonts = effectiveFontEmbeddingModes.has('inline');
  const renderTextAsGlyphShapes = effectiveFontEmbeddingModes.has('glyphs');

  /** Convert scene coordinate to Lottie composition coordinate */
  function toComp(sceneX: number, sceneY: number): { x: number; y: number } {
    return {
      x: (sceneX - camLeft) * sx,
      y: (sceneY - camTop) * sy,
    };
  }

  // Build group null layers first
  const { groupLayers, parentMap } = buildGroupLayers(
    targets, tracks, fps, clipStart, ip, op,
    elements.length + 1,
  );

  // Convert each element to a Lottie layer
  const elementLayers: LottieLayer[] = [];
  const imageAssets: LottieImageAsset[] = [];
  const usedFonts = new Map<string, LottieFont>();
  let layerIdx = 1;

  for (const el of elements) {
    if (el.isDeleted) continue;
    if (el.id === CAMERA_FRAME_ID) continue;

    const target = targets.find(t => t.id === el.id);
    const elType = el.type as string;

    // Skip unsupported types
    if (elType === 'freedraw' || elType === 'image' || elType === 'frame') {
      layerIdx++;
      continue;
    }

    // Get element position in scene coords, then map to composition coords
    const scenePos = getElementPosition(el);
    const compPos = toComp(scenePos.x, scenePos.y);

    // Build animated transform
    const props = groupTracksByProperty(tracks, el.id);
    const baseAngle = (el.angle ?? 0) * (180 / Math.PI);
    const baseOpacity = el.opacity ?? 100;

    // Scale translate keyframes from scene units to composition units
    const scaledProps = {
      ...props,
      translateX: props.translateX.map(kf => ({ ...kf, value: kf.value * sx })),
      translateY: props.translateY.map(kf => ({ ...kf, value: kf.value * sy })),
    };

    if (elType === 'text') {
      const text = typeof el.originalText === 'string' ? el.originalText : (el.text ?? '');
      const font = resolveTextFont(el.fontFamily);
      const scaledFontSize = Math.max(1, (el.fontSize ?? 20) * ((sx + sy) / 2));
      const textColor = hexToLottie(el.strokeColor ?? '#1e1e1e');
      const textBox = estimateTextBox(el, sx, sy);
      if (includeInlineTextFonts) {
        const fontPath = await resolveFontPath(font, embedFontsAsDataUri);
        usedFonts.set(font.fName, {
          fName: font.fName,
          fFamily: font.fFamily,
          fStyle: font.fStyle ?? 'Regular',
          ...(font.fClass ? { fClass: font.fClass } : {}),
          ...(font.fWeight ? { fWeight: font.fWeight } : {}),
          ...fontPath,
        });
      }

      if (!renderTextAsGlyphShapes) {
        const transform = buildTransform(compPos.x, compPos.y, baseAngle, baseOpacity, scaledProps, fps, clipStart, {
          width: textBox.width,
          height: textBox.height,
        });
        transform.a = staticMulti([textBox.width / 2, textBox.height / 2, 0]);
        const textColorRgb = textColor.slice(0, 3);

        const textLayer: LottieLayer = {
          ty: 5,
          nm: target?.label ?? el.id,
          ind: layerIdx,
          ip,
          op,
          st: 0,
          ks: transform,
          t: {
            a: [],
            d: {
              k: [{
                s: {
                  s: scaledFontSize,
                  f: font.fName,
                  t: text,
                  j: toLottieTextJustify(el.textAlign),
                  fc: textColorRgb,
                  sc: textColorRgb,
                  sw: 0,
                },
                t: 0,
              }],
            },
            m: { a: staticMulti([0, 0]) },
            p: {},
          },
        };

        const parentIdx = parentMap.get(el.id);
        if (parentIdx !== undefined) textLayer.parent = parentIdx;

        elementLayers.push(textLayer);
        layerIdx++;
        continue;
      }

      const glyphSvg = await renderElementToSvg(el, files);
      const glyphShapeGroup = await elementToLottieShapes(el, files, sx, sy, glyphSvg);
      const hasGlyphPathData = glyphShapeGroup.it.some(item => item.ty === 'sh');
      const hasGlyphPaintStyle = glyphShapeGroup.it.some(item => item.ty === 'fl' || item.ty === 'st');
      if (hasGlyphPathData && !hasGlyphPaintStyle) {
        glyphShapeGroup.it.splice(glyphShapeGroup.it.length - 1, 0, {
          ty: 'fl',
          nm: 'Glyph Fill',
          c: staticMulti(textColor),
          o: staticVal(100),
          r: 1,
        } as LottieFill);
      }
      if (hasGlyphPathData) {
        const shapeTransform = buildTransform(compPos.x, compPos.y, baseAngle, baseOpacity, scaledProps, fps, clipStart, {
          width: textBox.width,
          height: textBox.height,
        });
        shapeTransform.a = staticMulti([0, 0, 0]);
        const glyphShapeLayer: LottieShapeLayer = {
          ty: 4,
          nm: target?.label ?? el.id,
          ind: layerIdx,
          ip,
          op,
          st: 0,
          ks: shapeTransform,
          shapes: [glyphShapeGroup],
        };

        const parentIdx = parentMap.get(el.id);
        if (parentIdx !== undefined) glyphShapeLayer.parent = parentIdx;

        elementLayers.push(glyphShapeLayer);
        layerIdx++;
        continue;
      }

      const glyphAsset = await elementToLottiePngImageAsset(el, files, sx, sy, glyphSvg);
      const glyphAssetId = `glyph-${el.id}`;
      imageAssets.push({
        id: glyphAssetId,
        w: Math.max(1, Math.round(glyphAsset.width)),
        h: Math.max(1, Math.round(glyphAsset.height)),
        u: '',
        p: glyphAsset.dataUri,
        e: 1,
      });

      const imageTransform = buildTransform(compPos.x, compPos.y, baseAngle, baseOpacity, scaledProps, fps, clipStart, {
        width: glyphAsset.width,
        height: glyphAsset.height,
      });
      imageTransform.a = staticMulti([glyphAsset.width / 2, glyphAsset.height / 2, 0]);
      const glyphImageLayer: LottieImageLayer = {
        ty: 2,
        nm: target?.label ?? el.id,
        ind: layerIdx,
        ip,
        op,
        st: 0,
        ks: imageTransform,
        refId: glyphAssetId,
      };

      const parentIdx = parentMap.get(el.id);
      if (parentIdx !== undefined) glyphImageLayer.parent = parentIdx;

      elementLayers.push(glyphImageLayer);
      layerIdx++;
      continue;
    }

    // Render element through Excalidraw's SVG exporter to capture exact visual.
    // This also powers glyph mode for text by converting text outlines into shapes.
    const shapeGroup = await elementToLottieShapes(el, files, sx, sy);

    // Add trim path for drawProgress animation
    const trimPath = buildTrimPath(scaledProps, fps, clipStart);
    if (trimPath) {
      shapeGroup.it.splice(shapeGroup.it.length - 1, 0, trimPath);
    }

    const shapeWidth = Math.max(1, Math.abs((el.width ?? 0) * sx));
    const shapeHeight = Math.max(1, Math.abs((el.height ?? 0) * sy));
    const transform = buildTransform(compPos.x, compPos.y, baseAngle, baseOpacity, scaledProps, fps, clipStart, {
      width: shapeWidth,
      height: shapeHeight,
    });

    // Set anchor point to [0,0] — shapes are drawn relative to anchor
    transform.a = staticMulti([0, 0, 0]);

    const shapeLayer: LottieShapeLayer = {
      ty: 4,
      nm: target?.label ?? el.id,
      ind: layerIdx,
      ip,
      op,
      st: 0,
      ks: transform,
      shapes: [shapeGroup],
    };

    const parentIdx = parentMap.get(el.id);
    if (parentIdx !== undefined) shapeLayer.parent = parentIdx;

    elementLayers.push(shapeLayer);
    layerIdx++;
  }

  // Build camera null layer if camera animation exists.
  // All element layers parent to this so camera pan/zoom affects everything.
  const cameraLayer = buildCameraLayer(
    tracks, Math.round(width), Math.round(height), sx, sy,
    fps, clipStart, ip, op, layerIdx,
  );

  if (cameraLayer) {
    // Parent all element and group layers to the camera null layer
    for (const layer of elementLayers) {
      if (layer.parent === undefined) layer.parent = cameraLayer.ind;
    }
    for (const layer of groupLayers) {
      if (layer.parent === undefined) layer.parent = cameraLayer.ind;
    }
  }

  // Lottie renders layers top-to-bottom, so reverse for correct z-order
  const allLayers: LottieLayer[] = [
    ...elementLayers.reverse(),
    ...groupLayers,
    ...(cameraLayer ? [cameraLayer] : []),
  ];

  const animation: LottieAnimation = {
    v: '5.7.4',
    fr: fps,
    w: Math.round(width),
    h: Math.round(height),
    ip,
    op,
    layers: allLayers,
    assets: imageAssets.length > 0 ? imageAssets : undefined,
    fonts: usedFonts.size > 0 ? { list: [...usedFonts.values()] } : undefined,
    nm: 'Excalimate Animation',
  };

  return animation;
}

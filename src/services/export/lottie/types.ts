/**
 * Lottie JSON format type definitions.
 * Based on https://lottie.github.io/lottie-spec/1.0/
 */

// ── Root ──────────────────────────────────────────────────────

export interface LottieAnimation {
  /** Lottie version (e.g. "5.7.4") */
  v: string;
  /** Frames per second */
  fr: number;
  /** Composition width */
  w: number;
  /** Composition height */
  h: number;
  /** In-point (first frame) */
  ip: number;
  /** Out-point (last frame) */
  op: number;
  /** Layers */
  layers: LottieLayer[];
  /** Assets (precomps, images) */
  assets?: LottieAsset[];
  /** Name */
  nm?: string;
}

// ── Assets ────────────────────────────────────────────────────

export interface LottiePrecompAsset {
  id: string;
  layers: LottieLayer[];
  w?: number;
  h?: number;
  nm?: string;
}

export type LottieAsset = LottiePrecompAsset;

// ── Layers ────────────────────────────────────────────────────

export interface LottieLayerBase {
  /** Layer name */
  nm?: string;
  /** Layer index (for parenting) */
  ind?: number;
  /** Parent layer index */
  parent?: number;
  /** In-point frame */
  ip: number;
  /** Out-point frame */
  op: number;
  /** Start time offset */
  st: number;
  /** Transform */
  ks: LottieTransform;
  /** Blend mode (0 = normal) */
  bm?: number;
}

/** Shape layer (ty: 4) */
export interface LottieShapeLayer extends LottieLayerBase {
  ty: 4;
  shapes: LottieShapeItem[];
}

/** Text layer (ty: 5) */
export interface LottieTextLayer extends LottieLayerBase {
  ty: 5;
  t: LottieTextData;
}

/** Null layer (ty: 3) — used for group parenting */
export interface LottieNullLayer extends LottieLayerBase {
  ty: 3;
}

/** Precomp layer (ty: 0) — references an asset */
export interface LottiePrecompLayer extends LottieLayerBase {
  ty: 0;
  refId: string;
  w: number;
  h: number;
}

export type LottieLayer = LottieShapeLayer | LottieTextLayer | LottieNullLayer | LottiePrecompLayer;

// ── Transform ─────────────────────────────────────────────────

export interface LottieTransform {
  /** Anchor point */
  a: LottieMultiValue;
  /** Position */
  p: LottieMultiValue;
  /** Scale (100 = 100%) */
  s: LottieMultiValue;
  /** Rotation (degrees) */
  r: LottieSingleValue;
  /** Opacity (0–100) */
  o: LottieSingleValue;
}

// ── Animated Values ───────────────────────────────────────────

/** Static or animated single value (e.g. rotation, opacity) */
export interface LottieSingleValue {
  /** 0 = static, 1 = animated */
  a: 0 | 1;
  /** Static value or keyframe array */
  k: number | LottieKeyframe[];
}

/** Static or animated multi-dimensional value (e.g. position, scale) */
export interface LottieMultiValue {
  a: 0 | 1;
  k: number[] | LottieKeyframe[];
}

/** Keyframe */
export interface LottieKeyframe {
  /** Frame number */
  t: number;
  /** Start value (array for multi-dimensional) */
  s: number[];
  /** In-tangent (bezier easing handle) */
  i?: { x: number[]; y: number[] };
  /** Out-tangent (bezier easing handle) */
  o?: { x: number[]; y: number[] };
}

// ── Shape Items ───────────────────────────────────────────────

export interface LottieShapeGroup {
  ty: 'gr';
  nm?: string;
  it: LottieShapeItem[];
}

export interface LottieRect {
  ty: 'rc';
  nm?: string;
  /** Center position */
  p: LottieMultiValue;
  /** Size [w, h] */
  s: LottieMultiValue;
  /** Corner radius */
  r: LottieSingleValue;
}

export interface LottieEllipse {
  ty: 'el';
  nm?: string;
  p: LottieMultiValue;
  s: LottieMultiValue;
}

export interface LottiePath {
  ty: 'sh';
  nm?: string;
  ks: {
    a: 0;
    k: {
      /** Closed path */
      c: boolean;
      /** Vertices [x, y] */
      v: number[][];
      /** In-tangents */
      i: number[][];
      /** Out-tangents */
      o: number[][];
    };
  };
}

export interface LottieFill {
  ty: 'fl';
  nm?: string;
  /** Color [r, g, b, a] (0–1 range) */
  c: LottieMultiValue;
  /** Opacity (0–100) */
  o: LottieSingleValue;
  /** Fill rule (1 = nonzero, 2 = evenodd) */
  r?: number;
}

export interface LottieStroke {
  ty: 'st';
  nm?: string;
  c: LottieMultiValue;
  o: LottieSingleValue;
  /** Width */
  w: LottieSingleValue;
  /** Line cap (1=butt, 2=round, 3=square) */
  lc?: number;
  /** Line join (1=miter, 2=round, 3=bevel) */
  lj?: number;
}

export interface LottieTrimPath {
  ty: 'tm';
  nm?: string;
  /** Start (0–100) */
  s: LottieSingleValue;
  /** End (0–100) */
  e: LottieSingleValue;
  /** Offset (degrees) */
  o: LottieSingleValue;
}

export interface LottieShapeTransform {
  ty: 'tr';
  p: LottieMultiValue;
  a: LottieMultiValue;
  s: LottieMultiValue;
  r: LottieSingleValue;
  o: LottieSingleValue;
}

export type LottieShapeItem =
  | LottieShapeGroup
  | LottieRect
  | LottieEllipse
  | LottiePath
  | LottieFill
  | LottieStroke
  | LottieTrimPath
  | LottieShapeTransform;

// ── Text ──────────────────────────────────────────────────────

export interface LottieTextData {
  d: {
    k: [{
      s: {
        /** Font size */
        s: number;
        /** Font family */
        f: string;
        /** Text content */
        t: string;
        /** Justification (0=left, 1=right, 2=center) */
        j?: number;
        /** Fill color [r, g, b, a] */
        fc?: number[];
        /** Stroke color [r, g, b, a] */
        sc?: number[];
        /** Stroke width */
        sw?: number;
        /** Line height */
        lh?: number;
      };
      t: number;
    }];
  };
}

// ── Helpers ───────────────────────────────────────────────────

/** Create a static single value */
export function staticVal(v: number): LottieSingleValue {
  return { a: 0, k: v };
}

/** Create a static multi-dimensional value */
export function staticMulti(v: number[]): LottieMultiValue {
  return { a: 0, k: v };
}

/** Create an animated single value */
export function animatedVal(keyframes: LottieKeyframe[]): LottieSingleValue {
  return { a: 1, k: keyframes };
}

/** Create an animated multi-dimensional value */
export function animatedMulti(keyframes: LottieKeyframe[]): LottieMultiValue {
  return { a: 1, k: keyframes };
}

/** Create a default identity transform */
export function defaultTransform(): LottieTransform {
  return {
    a: staticMulti([0, 0, 0]),
    p: staticMulti([0, 0, 0]),
    s: staticMulti([100, 100, 100]),
    r: staticVal(0),
    o: staticVal(100),
  };
}

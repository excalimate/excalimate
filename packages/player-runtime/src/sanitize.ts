import { PROJECT_LIMITS } from '@excalimate/project-schema';
import { PLAYER_PACKAGE_LIMITS } from './types.js';

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
const MAX_SVG_DEPTH = 64;
const ALLOWED_ELEMENTS = new Set([
  'svg',
  'g',
  'defs',
  'path',
  'rect',
  'circle',
  'ellipse',
  'line',
  'polyline',
  'polygon',
  'text',
  'tspan',
  'clipPath',
  'mask',
  'linearGradient',
  'radialGradient',
  'stop',
  'pattern',
  'symbol',
  'image',
  'use',
]);
const ALLOWED_ATTRIBUTES = new Set([
  'xmlns',
  'xmlns:xlink',
  'viewBox',
  'width',
  'height',
  'x',
  'y',
  'x1',
  'y1',
  'x2',
  'y2',
  'cx',
  'cy',
  'r',
  'rx',
  'ry',
  'd',
  'points',
  'transform',
  'opacity',
  'fill',
  'fill-opacity',
  'fill-rule',
  'stroke',
  'stroke-width',
  'stroke-opacity',
  'stroke-linecap',
  'stroke-linejoin',
  'stroke-miterlimit',
  'stroke-dasharray',
  'stroke-dashoffset',
  'paint-order',
  'vector-effect',
  'font-family',
  'font-size',
  'font-style',
  'font-weight',
  'letter-spacing',
  'text-anchor',
  'dominant-baseline',
  'alignment-baseline',
  'clip-path',
  'mask',
  'offset',
  'stop-color',
  'stop-opacity',
  'preserveAspectRatio',
  'href',
  'xlink:href',
  'id',
  'style',
  'data-excalimate-id',
  'data-excalimate-origin',
  'data-excalimate-center',
  'data-excalimate-bound-to',
  'data-excalimate-scene',
]);
const ALLOWED_STYLE_PROPERTIES = new Set([
  'fill',
  'fill-opacity',
  'fill-rule',
  'stroke',
  'stroke-width',
  'stroke-opacity',
  'stroke-linecap',
  'stroke-linejoin',
  'stroke-dasharray',
  'stroke-dashoffset',
  'opacity',
  'font-family',
  'font-size',
  'font-style',
  'font-weight',
  'letter-spacing',
  'text-anchor',
  'paint-order',
  'vector-effect',
]);
const ALLOWED_DATA_IMAGE_MIMES = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/avif',
  'image/svg+xml',
]);
const LOCAL_URL_ATTRIBUTES = new Set([
  'fill',
  'stroke',
  'clip-path',
  'mask',
]);
const TARGET_ID_PATTERN = /^[A-Za-z0-9_-]{1,256}$/;

export interface SanitizedSvg {
  svg: string;
  elementIds: readonly string[];
  viewBox: Readonly<{ x: number; y: number; width: number; height: number }>;
}

export class SvgSanitizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SvgSanitizationError';
  }
}

export function sanitizeSvg(svg: string): SanitizedSvg {
  const bytes = new TextEncoder().encode(svg).byteLength;
  if (bytes === 0 || bytes > PLAYER_PACKAGE_LIMITS.maxSvgBytes) {
    throw new SvgSanitizationError('SVG scene is empty or exceeds the size limit');
  }
  if (typeof DOMParser === 'undefined' || typeof XMLSerializer === 'undefined') {
    throw new SvgSanitizationError('SVG parsing is unavailable in this environment');
  }

  const document = new DOMParser().parseFromString(svg, 'image/svg+xml');
  const root = document.documentElement;
  if (
    root.namespaceURI !== SVG_NAMESPACE ||
    root.localName !== 'svg' ||
    document.querySelector('parsererror')
  ) {
    throw new SvgSanitizationError('SVG scene is malformed');
  }

  const elements = collectAllowedElements(root);
  if (elements.length > PROJECT_LIMITS.maxCollectionItems) {
    throw new SvgSanitizationError('SVG scene contains too many elements');
  }

  const rewrittenIds = collectControlledIds(elements);
  const targetIds = new Set<string>();
  for (const element of elements) {
    sanitizeAttributes(element, rewrittenIds, targetIds, true);
  }
  root.setAttribute('xmlns', SVG_NAMESPACE);

  const serialized = new XMLSerializer().serializeToString(root);
  if (
    new TextEncoder().encode(serialized).byteLength >
    PLAYER_PACKAGE_LIMITS.maxSvgBytes
  ) {
    throw new SvgSanitizationError('Sanitized SVG exceeds the size limit');
  }

  return {
    svg: serialized,
    elementIds: [...targetIds].sort(),
    viewBox: parseViewBox(root),
  };
}

function collectAllowedElements(root: Element): Element[] {
  const elements: Element[] = [];
  const stack: Array<{ element: Element; depth: number }> = [
    { element: root, depth: 1 },
  ];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;
    const { element, depth } = current;
    if (depth > MAX_SVG_DEPTH) {
      throw new SvgSanitizationError('SVG scene nesting exceeds the depth limit');
    }
    if (
      element.namespaceURI !== SVG_NAMESPACE ||
      !ALLOWED_ELEMENTS.has(element.localName)
    ) {
      element.remove();
      continue;
    }
    elements.push(element);
    const children = Array.from(element.children);
    for (let index = children.length - 1; index >= 0; index -= 1) {
      const child = children[index];
      if (child) {
        stack.push({ element: child, depth: depth + 1 });
      }
    }
  }
  return elements;
}

function collectControlledIds(elements: readonly Element[]): Map<string, string> {
  const rewritten = new Map<string, string>();
  let index = 0;
  for (const element of elements) {
    const original = element.getAttribute('id');
    if (!original) continue;
    if (rewritten.has(original)) {
      throw new SvgSanitizationError('SVG scene contains duplicate IDs');
    }
    rewritten.set(original, `xmt-${index}`);
    index += 1;
  }
  return rewritten;
}

function sanitizeAttributes(
  element: Element,
  rewrittenIds: ReadonlyMap<string, string>,
  targetIds: Set<string>,
  allowSvgDataImages: boolean,
): void {
  for (const attribute of Array.from(element.attributes)) {
    const name = attribute.name;
    const lowerName = name.toLowerCase();
    if (
      lowerName.startsWith('on') ||
      !ALLOWED_ATTRIBUTES.has(name) ||
      hasUnsafeText(attribute.value)
    ) {
      element.removeAttribute(name);
      continue;
    }

    if (name === 'id') {
      const controlled = rewrittenIds.get(attribute.value);
      if (controlled) element.setAttribute(name, controlled);
      else element.removeAttribute(name);
      continue;
    }
    if (name === 'data-excalimate-id') {
      if (!TARGET_ID_PATTERN.test(attribute.value) || targetIds.has(attribute.value)) {
        throw new SvgSanitizationError('SVG scene has an invalid target marker');
      }
      if (element.parentElement?.closest('[data-excalimate-id]')) {
        throw new SvgSanitizationError('SVG animation targets must not be nested');
      }
      targetIds.add(attribute.value);
      continue;
    }
    if (
      name === 'data-excalimate-origin' ||
      name === 'data-excalimate-center'
    ) {
      if (!isFiniteNumberPair(attribute.value)) element.removeAttribute(name);
      continue;
    }
    if (name === 'data-excalimate-bound-to') {
      if (!TARGET_ID_PATTERN.test(attribute.value)) element.removeAttribute(name);
      continue;
    }
    if (name === 'data-excalimate-scene') {
      if (attribute.value !== 'true') element.removeAttribute(name);
      continue;
    }
    if (name === 'href' || name === 'xlink:href') {
      const safeHref = sanitizeHref(
        element,
        attribute.value,
        rewrittenIds,
        allowSvgDataImages,
      );
      if (safeHref === null) element.removeAttribute(name);
      else element.setAttribute(name, safeHref);
      continue;
    }
    if (name === 'style') {
      const style = sanitizeStyle(attribute.value, rewrittenIds);
      if (style) element.setAttribute(name, style);
      else element.removeAttribute(name);
      continue;
    }
    if (LOCAL_URL_ATTRIBUTES.has(name) && containsUrlFunction(attribute.value)) {
      const safeValue = sanitizeLocalUrl(attribute.value, rewrittenIds);
      if (safeValue === null) element.removeAttribute(name);
      else element.setAttribute(name, safeValue);
    }
  }
}

function sanitizeHref(
  element: Element,
  value: string,
  rewrittenIds: ReadonlyMap<string, string>,
  allowSvgDataImages: boolean,
): string | null {
  const trimmed = value.trim();
  if (trimmed.startsWith('#')) {
    const controlled = rewrittenIds.get(trimmed.slice(1));
    return controlled ? `#${controlled}` : null;
  }
  if (element.localName !== 'image') return null;
  const match = /^data:([^;,]+);base64,([A-Za-z0-9+/=\s]+)$/i.exec(trimmed);
  if (!match || !ALLOWED_DATA_IMAGE_MIMES.has(match[1]?.toLowerCase() ?? '')) {
    return null;
  }
  const mimeType = match[1]?.toLowerCase();
  const payload = match[2]?.replace(/\s/g, '') ?? '';
  if (mimeType !== 'image/svg+xml') {
    return `data:${mimeType};base64,${payload}`;
  }
  if (!allowSvgDataImages) return null;
  const decodedSvg = decodeBase64Utf8(payload);
  if (!decodedSvg) return null;
  try {
    const sanitized = sanitizeSvgDataImage(decodedSvg);
    return `data:image/svg+xml;base64,${encodeBase64Utf8(sanitized)}`;
  } catch {
    return null;
  }
}

function sanitizeStyle(
  style: string,
  rewrittenIds: ReadonlyMap<string, string>,
): string {
  const declarations: string[] = [];
  for (const declaration of style.split(';')) {
    const separator = declaration.indexOf(':');
    if (separator <= 0) continue;
    const property = declaration.slice(0, separator).trim().toLowerCase();
    let value = declaration.slice(separator + 1).trim();
    if (!ALLOWED_STYLE_PROPERTIES.has(property) || hasUnsafeText(value)) continue;
    if (containsUrlFunction(value)) {
      const safeValue = sanitizeLocalUrl(value, rewrittenIds);
      if (safeValue === null) continue;
      value = safeValue;
    }
    declarations.push(`${property}:${value}`);
  }
  return declarations.join(';');
}

function sanitizeLocalUrl(
  value: string,
  rewrittenIds: ReadonlyMap<string, string>,
): string | null {
  const match = /^url\(\s*['"]?#([^'")\s]+)['"]?\s*\)$/i.exec(value.trim());
  if (!match) return null;
  const controlled = rewrittenIds.get(match[1] ?? '');
  return controlled ? `url(#${controlled})` : null;
}

function hasUnsafeText(value: string): boolean {
  const normalized = value.replace(/\s/g, '').toLowerCase();
  return (
    [...value].some((character) => {
      const code = character.charCodeAt(0);
      return code <= 8 || code === 11 || code === 12 || (code >= 14 && code <= 31);
    }) ||
    value.includes('\\') ||
    normalized.includes('javascript:') ||
    normalized.includes('vbscript:') ||
    normalized.includes('data:text/html') ||
    normalized.includes('expression(') ||
    normalized.includes('@import')
  );
}

function containsUrlFunction(value: string): boolean {
  return /url\s*\(/i.test(value);
}

function decodeBase64Utf8(value: string): string | null {
  try {
    const binary = atob(value);
    const bytes = Uint8Array.from(binary, (character) =>
      character.charCodeAt(0),
    );
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

function encodeBase64Utf8(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function sanitizeSvgDataImage(svg: string): string {
  if (
    new TextEncoder().encode(svg).byteLength === 0 ||
    new TextEncoder().encode(svg).byteLength > PLAYER_PACKAGE_LIMITS.maxSvgBytes
  ) {
    throw new SvgSanitizationError('Embedded SVG image exceeds the size limit');
  }
  const document = new DOMParser().parseFromString(svg, 'image/svg+xml');
  const root = document.documentElement;
  if (
    root.namespaceURI !== SVG_NAMESPACE ||
    root.localName !== 'svg' ||
    document.querySelector('parsererror')
  ) {
    throw new SvgSanitizationError('Embedded SVG image is malformed');
  }
  const elements = collectAllowedElements(root);
  if (elements.length > PROJECT_LIMITS.maxCollectionItems) {
    throw new SvgSanitizationError('Embedded SVG image has too many elements');
  }
  const rewrittenIds = collectControlledIds(elements);
  const targetIds = new Set<string>();
  for (const element of elements) {
    sanitizeAttributes(element, rewrittenIds, targetIds, false);
    element.removeAttribute('data-excalimate-id');
    element.removeAttribute('data-excalimate-origin');
    element.removeAttribute('data-excalimate-center');
    element.removeAttribute('data-excalimate-bound-to');
    element.removeAttribute('data-excalimate-scene');
  }
  root.setAttribute('xmlns', SVG_NAMESPACE);
  return new XMLSerializer().serializeToString(root);
}

function isFiniteNumberPair(value: string): boolean {
  const parts = value.trim().split(/\s+/);
  if (parts.length !== 2) return false;
  return parts.every((part) => {
    if (!/^-?(?:\d+|\d*\.\d+)(?:e[+-]?\d+)?$/i.test(part)) return false;
    return Number.isFinite(Number(part));
  });
}

function parseViewBox(
  root: Element,
): Readonly<{ x: number; y: number; width: number; height: number }> {
  const values = (root.getAttribute('viewBox') ?? '')
    .trim()
    .split(/[\s,]+/)
    .map(Number);
  if (
    values.length !== 4 ||
    values.some((value) => !Number.isFinite(value)) ||
    (values[2] ?? 0) <= 0 ||
    (values[3] ?? 0) <= 0
  ) {
    throw new SvgSanitizationError('SVG scene has an invalid viewBox');
  }
  return {
    x: values[0] ?? 0,
    y: values[1] ?? 0,
    width: values[2] ?? 0,
    height: values[3] ?? 0,
  };
}

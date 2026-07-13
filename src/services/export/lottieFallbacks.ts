import type { AnimationTimeline } from '@excalimate/project-schema';
import type { ExportFormat, ExportPreflightIssue } from '@excalimate/export-runtime';

const RASTER_FALLBACK_TYPES = new Set(['frame', 'freedraw', 'image']);
export const MAX_LOTTIE_RASTER_DIMENSION = 4_096;
export const MAX_LOTTIE_RASTER_PIXELS = 16_777_216;
export const MAX_LOTTIE_TOTAL_RASTER_PIXELS = 33_554_432;

export function getLottieFallbackIssues(
  format: ExportFormat,
  elements: readonly {
    id: string;
    type: string;
    width: number;
    height: number;
    startBinding?: { elementId: string } | null;
    endBinding?: { elementId: string } | null;
  }[],
  timeline: AnimationTimeline,
  scale: Readonly<{ x: number; y: number }> = { x: 1, y: 1 },
): ExportPreflightIssue[] {
  if (format !== 'lottie' && format !== 'dotlottie') return [];
  const rasterElementIds = new Set(
    elements
      .filter((element) => RASTER_FALLBACK_TYPES.has(element.type))
      .map((element) => element.id),
  );
  const issues: ExportPreflightIssue[] = [];
  if (rasterElementIds.size > 0) {
    issues.push({
      code: 'lottie-raster-fallback',
      severity: 'warning',
      message: `${rasterElementIds.size} image, freehand, or frame element${rasterElementIds.size === 1 ? '' : 's'} will be embedded as raster layers. Transform, opacity, groups, and camera animation remain active.`,
    });
  }
  let totalPixels = 0;
  let oversizedAssets = 0;
  for (const element of elements) {
    if (!rasterElementIds.has(element.id)) continue;
    const width = Math.max(1, Math.ceil(Math.abs(element.width) * scale.x));
    const height = Math.max(1, Math.ceil(Math.abs(element.height) * scale.y));
    totalPixels += width * height;
    if (
      width > MAX_LOTTIE_RASTER_DIMENSION ||
      height > MAX_LOTTIE_RASTER_DIMENSION ||
      width * height > MAX_LOTTIE_RASTER_PIXELS
    ) {
      oversizedAssets += 1;
    }
  }
  if (oversizedAssets > 0 || totalPixels > MAX_LOTTIE_TOTAL_RASTER_PIXELS) {
    issues.push({
      code: 'lottie-raster-budget-exceeded',
      severity: 'error',
      message:
        'Lottie raster fallback exceeds the per-asset or aggregate canvas pixel budget. Reduce element size or export resolution.',
    });
  }
  if (
    elements.some(
      (element) =>
        (element.type === 'arrow' || element.type === 'line') &&
        (element.startBinding || element.endBinding),
    )
  ) {
    issues.push({
      code: 'lottie-bound-endpoint-fallback',
      severity: 'warning',
      message:
        'Lottie keeps bound arrow and line endpoint geometry static while preserving the layer transform. Use SVG, video, GIF, or the hosted player when independently animated endpoints must remain attached.',
    });
  }
  if (
    timeline.tracks.some(
      (track) =>
        track.enabled && track.property === 'drawProgress' && rasterElementIds.has(track.targetId),
    )
  ) {
    issues.push({
      code: 'lottie-raster-draw-fallback',
      severity: 'warning',
      message:
        'Draw progress is not representable on raster Lottie layers; affected layers remain fully drawn while their other animation continues.',
    });
  }
  return issues;
}

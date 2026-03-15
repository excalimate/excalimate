/* eslint-disable @typescript-eslint/no-explicit-any */
import type { AnimationTrack, ServerState } from '../types.js';
import { ASPECT_RATIOS, PROPERTY_DEFAULTS } from '../types.js';

export const ORIGIN_MAP: Record<string, [number, number]> = {
  'top-left': [0, 0],
  'top': [0.5, 0],
  'top-right': [1, 0],
  'left': [0, 0.5],
  'center': [0.5, 0.5],
  'right': [1, 0.5],
  'bottom-left': [0, 1],
  'bottom': [0.5, 1],
  'bottom-right': [1, 1],
};

export function getElementBounds(el: any): { minX: number; minY: number; maxX: number; maxY: number } {
  if (el.points?.length > 0) {
    let minX = Infinity; let minY = Infinity; let maxX = -Infinity; let maxY = -Infinity;
    for (const [px, py] of el.points) {
      const ax = el.x + px; const ay = el.y + py;
      if (ax < minX) minX = ax; if (ay < minY) minY = ay;
      if (ax > maxX) maxX = ax; if (ay > maxY) maxY = ay;
    }
    return { minX, minY, maxX, maxY };
  }
  const x1 = Math.min(el.x, el.x + el.width);
  const y1 = Math.min(el.y, el.y + el.height);
  return { minX: x1, minY: y1, maxX: x1 + Math.abs(el.width), maxY: y1 + Math.abs(el.height) };
}

export function interpolateTrackAt(track: AnimationTrack, time: number): number {
  const kfs = track.keyframes;
  if (kfs.length === 0) return PROPERTY_DEFAULTS[track.property];
  if (time <= kfs[0].time) return kfs[0].value;
  if (time >= kfs[kfs.length - 1].time) return kfs[kfs.length - 1].value;
  for (let i = 0; i < kfs.length - 1; i++) {
    if (time >= kfs[i].time && time <= kfs[i + 1].time) {
      const t = (time - kfs[i].time) / (kfs[i + 1].time - kfs[i].time);
      return kfs[i].value + (kfs[i + 1].value - kfs[i].value) * t;
    }
  }
  return kfs[kfs.length - 1].value;
}

export function getAnimatedBoundsAt(
  state: ServerState,
  elId: string,
  time: number,
): { minX: number; minY: number; maxX: number; maxY: number } | null {
  const el = state.scene.elements.find((e: any) => e.id === elId);
  if (!el) return null;
  const base = getElementBounds(el);
  const tracks = state.timeline.tracks.filter((t: any) => t.targetId === elId);
  let tx = 0; let ty = 0; let sx = 1; let sy = 1;
  for (const track of tracks) {
    const v = interpolateTrackAt(track, time);
    if (track.property === 'translateX') tx = v;
    if (track.property === 'translateY') ty = v;
    if (track.property === 'scaleX') sx = v;
    if (track.property === 'scaleY') sy = v;
  }
  const w = (base.maxX - base.minX) * sx;
  const h = (base.maxY - base.minY) * sy;
  return { minX: base.minX + tx, minY: base.minY + ty, maxX: base.minX + tx + w, maxY: base.minY + ty + h };
}

export function getCameraRectAt(
  state: ServerState,
  time: number,
): { left: number; top: number; right: number; bottom: number; cx: number; cy: number } {
  const cf = state.cameraFrame;
  const camTracks = state.timeline.tracks.filter((t: any) => t.targetId === '__camera_frame__');
  let tx = 0; let ty = 0; let sx = 1; let sy = 1;
  for (const track of camTracks) {
    const v = interpolateTrackAt(track, time);
    if (track.property === 'translateX') tx = v;
    if (track.property === 'translateY') ty = v;
    if (track.property === 'scaleX') sx = v;
    if (track.property === 'scaleY') sy = v;
  }
  const w = cf.width * sx;
  const h = (cf.width / (ASPECT_RATIOS[cf.aspectRatio] ?? 16 / 9)) * sy;
  const cx = cf.x + tx;
  const cy = cf.y + ty;
  return { left: cx - w / 2, top: cy - h / 2, right: cx + w / 2, bottom: cy + h / 2, cx, cy };
}

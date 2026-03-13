/**
 * Animation export pipeline.
 * Uses Excalidraw's exportToCanvas for reliable frame rendering,
 * then crops to camera frame bounds.
 */

import { getNonDeletedElements } from '@excalidraw/excalidraw';
import type { ExcalidrawElement, NonDeletedExcalidrawElement } from '@excalidraw/excalidraw/element/types';
import { AnimationEngine } from '../core/engine/AnimationEngine';
import { useAnimationStore } from '../stores/animationStore';
import { useProjectStore } from '../stores/projectStore';
import {
  CAMERA_FRAME_TARGET_ID,
  getFrameHeight,
  getExportResolution,
} from '../stores/projectStore';
import type { FrameState, ElementAnimationState } from '../types/animation';
import { PROPERTY_DEFAULTS } from '../types/animation';
import type { AnimatableTarget } from '../types/excalidraw';
import { applyAnimationToElements } from '../core/engine/renderUtils';

export type ExportFormat = 'mp4' | 'webm' | 'gif' | 'svg';
export type ExportQuality = 'low' | 'medium' | 'high' | 'very-high';

export interface ExportOptions {
  format: ExportFormat;
  quality?: ExportQuality;
  fps?: number;
  onProgress?: (progress: number) => void;
}

const QUALITY_SETTINGS: Record<ExportQuality, { bitrate: number; gifQuality: number }> = {
  'low':       { bitrate: 2_000_000,  gifQuality: 20 },
  'medium':    { bitrate: 8_000_000,  gifQuality: 10 },
  'high':      { bitrate: 20_000_000, gifQuality: 5 },
  'very-high': { bitrate: 40_000_000, gifQuality: 1 },
};

function getCameraRect(
  cameraFrame: { x: number; y: number; width: number; aspectRatio: any },
  frameState: FrameState,
) {
  const cam = frameState.get(CAMERA_FRAME_TARGET_ID);
  return {
    x: cameraFrame.x + (cam?.translateX ?? 0),
    y: cameraFrame.y + (cam?.translateY ?? 0),
    width: cameraFrame.width * (cam?.scaleX ?? 1),
    height: getFrameHeight(cameraFrame) * (cam?.scaleY ?? 1),
  };
}

/**
 * Render a single animation frame. Uses exportToSvg with viewBox set to camera rect
 * for pixel-perfect sharpness at any resolution.
 */
async function renderFrame(
  elements: NonDeletedExcalidrawElement[],
  files: Record<string, any>,
  frameState: FrameState,
  targets: AnimatableTarget[],
  outW: number,
  outH: number,
  outputCanvas: HTMLCanvasElement,
): Promise<void> {
  try {
    const animated = applyAnimationToElements(elements, frameState, targets);

    // Camera rect
    const cam = frameState.get(CAMERA_FRAME_TARGET_ID);
    const cfg = useProjectStore.getState().cameraFrame;
    const cW = cfg.width * (cam?.scaleX ?? 1);
    const cH = getFrameHeight(cfg) * (cam?.scaleY ?? 1);
    const cCX = cfg.x + (cam?.translateX ?? 0);
    const cCY = cfg.y + (cam?.translateY ?? 0);

    // Use exportToSvg for perfect vector-quality rendering
    const { exportToSvg } = await import('@excalidraw/excalidraw');
    const svg = await exportToSvg({
      elements: animated,
      files: files ?? {},
      appState: { exportBackground: true },
      exportPadding: 0,
    });

    // Compute scene-to-SVG coordinate mapping
    const vb = svg.viewBox?.baseVal;
    let sMinX = Infinity, sMinY = Infinity, sMaxX = -Infinity, sMaxY = -Infinity;
    for (const el of animated) {
      const a = el as any;
      if (a.points?.length > 0) {
        for (const [px, py] of a.points as number[][]) {
          const ax = el.x + px, ay = el.y + py;
          if (ax < sMinX) sMinX = ax; if (ay < sMinY) sMinY = ay;
          if (ax > sMaxX) sMaxX = ax; if (ay > sMaxY) sMaxY = ay;
        }
      } else {
        const x1 = Math.min(el.x, el.x + el.width), y1 = Math.min(el.y, el.y + el.height);
        const x2 = Math.max(el.x, el.x + el.width), y2 = Math.max(el.y, el.y + el.height);
        if (x1 < sMinX) sMinX = x1; if (y1 < sMinY) sMinY = y1;
        if (x2 > sMaxX) sMaxX = x2; if (y2 > sMaxY) sMaxY = y2;
      }
    }

    // Map camera from scene coords to SVG coords
    const sceneW = (sMaxX - sMinX) || 1;
    const sceneH = (sMaxY - sMinY) || 1;
    const vbW = vb?.width ?? sceneW;
    const vbH = vb?.height ?? sceneH;
    const svgScaleX = vbW / sceneW;
    const svgScaleY = vbH / sceneH;
    const camSvgX = (cCX - cW / 2 - sMinX) * svgScaleX + (vb?.x ?? 0);
    const camSvgY = (cCY - cH / 2 - sMinY) * svgScaleY + (vb?.y ?? 0);
    const camSvgW = cW * svgScaleX;
    const camSvgH = cH * svgScaleY;

    // Set viewBox to camera rect — SVG renders only the visible area
    svg.setAttribute('viewBox', `${camSvgX} ${camSvgY} ${camSvgW} ${camSvgH}`);
    svg.setAttribute('width', String(outW));
    svg.setAttribute('height', String(outH));

    // Rasterize SVG to canvas at exact output resolution
    const svgStr = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const img = new Image(outW, outH);
    await new Promise<void>((resolve) => {
      img.onload = () => {
        const ctx = outputCanvas.getContext('2d')!;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, outW, outH);
        ctx.drawImage(img, 0, 0, outW, outH);
        URL.revokeObjectURL(url);
        resolve();
      };
      img.onerror = () => { URL.revokeObjectURL(url); resolve(); };
      img.src = url;
    });
  } catch (err) {
    console.error('[renderFrame] CRASH:', err);
    const ctx = outputCanvas.getContext('2d')!;
    ctx.fillStyle = 'red'; ctx.font = '20px monospace';
    ctx.fillText(String(err), 10, 30);
  }
}



async function exportWebM(options: ExportOptions): Promise<void> {
  const { fps = 30, quality = 'high', onProgress } = options;
  const qs = QUALITY_SETTINGS[quality];
  const timeline = useAnimationStore.getState().timeline;
  const project = useProjectStore.getState().project;
  const cameraFrame = useProjectStore.getState().cameraFrame;
  if (!project?.scene) throw new Error('No scene loaded');

  const elements = getNonDeletedElements(project.scene.elements as ExcalidrawElement[]) as NonDeletedExcalidrawElement[];
  const targets = useProjectStore.getState().targets;
  const res = getExportResolution(cameraFrame.aspectRatio);
  const engine = new AnimationEngine();
  const { clipStart, clipEnd } = useAnimationStore.getState();
  const clipDuration = clipEnd - clipStart;
  const totalFrames = Math.ceil(clipDuration / 1000 * fps);
  const frameDurationUs = Math.round(1_000_000 / fps);

  const canvas = document.createElement('canvas');
  canvas.width = res.width;
  canvas.height = res.height;

  const { Muxer, ArrayBufferTarget } = await import('webm-muxer');

  const useVP9 = await VideoEncoder.isConfigSupported({
    codec: 'vp09.00.10.08', width: res.width, height: res.height, bitrate: qs.bitrate,
  }).then(r => r.supported).catch(() => false);

  const codecString = useVP9 ? 'vp09.00.10.08' : 'vp8';
  const muxerCodec = useVP9 ? 'V_VP9' : 'V_VP8';

  const muxerTarget = new ArrayBufferTarget();
  const muxer = new Muxer({
    target: muxerTarget,
    video: { codec: muxerCodec, width: res.width, height: res.height, frameRate: fps },
  });

  const encoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (e) => console.error('VideoEncoder error:', e),
  });
  encoder.configure({ codec: codecString, width: res.width, height: res.height, bitrate: qs.bitrate, framerate: fps });

  onProgress?.(0);
  for (let i = 0; i <= totalFrames; i++) {
    const time = clipStart + (i / totalFrames) * clipDuration;
    engine.invalidateCache();
    const frameState = engine.computeFrame(timeline, time);
    await renderFrame(elements, project.scene.files, frameState, targets, res.width, res.height, canvas);
    const frame = new VideoFrame(canvas, { timestamp: i * frameDurationUs, duration: frameDurationUs });
    encoder.encode(frame, { keyFrame: i % (fps * 2) === 0 });
    frame.close();
    if (i % 10 === 0) await new Promise((r) => setTimeout(r, 0));
    onProgress?.((i + 1) / (totalFrames + 1));
  }

  await encoder.flush();
  encoder.close();
  muxer.finalize();

  const blob = new Blob([muxerTarget.buffer], { type: 'video/webm' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${project.name || 'animation'}.webm`;
  a.click();
  URL.revokeObjectURL(a.href);
}

async function exportMP4(options: ExportOptions): Promise<void> {
  const { fps = 30, quality = 'high', onProgress } = options;
  const qs = QUALITY_SETTINGS[quality];
  const timeline = useAnimationStore.getState().timeline;
  const project = useProjectStore.getState().project;
  const cameraFrame = useProjectStore.getState().cameraFrame;
  if (!project?.scene) throw new Error('No scene loaded');

  const elements = getNonDeletedElements(project.scene.elements as ExcalidrawElement[]) as NonDeletedExcalidrawElement[];
  const targets = useProjectStore.getState().targets;
  const res = getExportResolution(cameraFrame.aspectRatio);
  const engine = new AnimationEngine();
  const { clipStart, clipEnd } = useAnimationStore.getState();
  const clipDuration = clipEnd - clipStart;
  const totalFrames = Math.ceil(clipDuration / 1000 * fps);
  const frameDurationUs = Math.round(1_000_000 / fps);

  const canvas = document.createElement('canvas');
  canvas.width = res.width;
  canvas.height = res.height;

  const { Muxer, ArrayBufferTarget } = await import('mp4-muxer');

  // H.264 Baseline for maximum compatibility
  const h264Supported = await VideoEncoder.isConfigSupported({
    codec: 'avc1.640028', width: res.width, height: res.height, bitrate: qs.bitrate,
  }).then(r => r.supported).catch(() => false);

  if (!h264Supported) {
    throw new Error('H.264 encoding not supported in this browser. Try exporting as WebM instead.');
  }

  const muxerTarget = new ArrayBufferTarget();
  const muxer = new Muxer({
    target: muxerTarget,
    video: { codec: 'avc', width: res.width, height: res.height, frameRate: fps },
    fastStart: 'in-memory',
  });

  const encoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (e) => console.error('VideoEncoder error:', e),
  });
  encoder.configure({
    codec: 'avc1.640028', // H.264 High Profile Level 4.0
    width: res.width,
    height: res.height,
    bitrate: qs.bitrate,
    framerate: fps,
  });

  onProgress?.(0);
  for (let i = 0; i <= totalFrames; i++) {
    const time = clipStart + (i / totalFrames) * clipDuration;
    engine.invalidateCache();
    const frameState = engine.computeFrame(timeline, time);
    await renderFrame(elements, project.scene.files, frameState, targets, res.width, res.height, canvas);
    const frame = new VideoFrame(canvas, { timestamp: i * frameDurationUs, duration: frameDurationUs });
    encoder.encode(frame, { keyFrame: i % (fps * 2) === 0 });
    frame.close();
    if (i % 10 === 0) await new Promise((r) => setTimeout(r, 0));
    onProgress?.((i + 1) / (totalFrames + 1));
  }

  await encoder.flush();
  encoder.close();
  muxer.finalize();

  const blob = new Blob([muxerTarget.buffer], { type: 'video/mp4' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${project.name || 'animation'}.mp4`;
  a.click();
  URL.revokeObjectURL(a.href);
}

async function exportGIF(options: ExportOptions): Promise<void> {
  const { fps = 15, quality = 'medium', onProgress } = options;
  const qs = QUALITY_SETTINGS[quality];
  const timeline = useAnimationStore.getState().timeline;
  const project = useProjectStore.getState().project;
  const cameraFrame = useProjectStore.getState().cameraFrame;
  if (!project?.scene) throw new Error('No scene loaded');

  const elements = getNonDeletedElements(project.scene.elements as ExcalidrawElement[]) as NonDeletedExcalidrawElement[];
  const targets = useProjectStore.getState().targets;
  const res = getExportResolution(cameraFrame.aspectRatio);
  const maxWidth = quality === 'low' ? 480 : quality === 'medium' ? 640 : quality === 'high' ? 800 : 1280;
  const scale = Math.min(1, maxWidth / res.width);
  const gifW = Math.round(res.width * scale);
  const gifH = Math.round(res.height * scale);

  const engine = new AnimationEngine();
  const { clipStart, clipEnd } = useAnimationStore.getState();
  const clipDuration = clipEnd - clipStart;
  const totalFrames = Math.ceil(clipDuration / 1000 * fps);

  const canvas = document.createElement('canvas');
  canvas.width = gifW;
  canvas.height = gifH;

  const GIF = (await import('gif.js')).default;
  const gif = new GIF({
    workers: 2, quality: qs.gifQuality, width: gifW, height: gifH,
    workerScript: '/gif.worker.js',
  });

  onProgress?.(0);

  for (let i = 0; i <= totalFrames; i++) {
    const time = clipStart + (i / totalFrames) * clipDuration;
    engine.invalidateCache();
    const frameState = engine.computeFrame(timeline, time);

    await renderFrame(elements, project.scene.files, frameState, targets, gifW, gifH, canvas);
    gif.addFrame(canvas, { delay: Math.round(1000 / fps), copy: true });
    onProgress?.((i + 1) / (totalFrames + 1) * 0.8);
  }

  const blob = await new Promise<Blob>((resolve) => {
    gif.on('finished', (b: Blob) => resolve(b));
    gif.render();
  });
  onProgress?.(1);

  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${project.name || 'animation'}.gif`;
  a.click();
  URL.revokeObjectURL(a.href);
}

async function exportAnimatedSVG(options: ExportOptions): Promise<void> {
  // For SVG, we still use exportToSvg with CSS keyframes
  const { exportToSvg } = await import('@excalidraw/excalidraw');
  const { fps = 30, onProgress } = options;
  const timeline = useAnimationStore.getState().timeline;
  const project = useProjectStore.getState().project;
  const cameraFrame = useProjectStore.getState().cameraFrame;
  if (!project?.scene) throw new Error('No scene loaded');

  const elements = getNonDeletedElements(project.scene.elements as ExcalidrawElement[]) as NonDeletedExcalidrawElement[];
  const res = getExportResolution(cameraFrame.aspectRatio);
  const engine = new AnimationEngine();
  const { clipStart, clipEnd } = useAnimationStore.getState();
  const clipDuration = clipEnd - clipStart;
  const totalFrames = Math.ceil(clipDuration / 1000 * fps);

  const svg = await exportToSvg({
    elements,
    files: project.scene.files ?? {},
    appState: { exportBackground: true },
    exportPadding: 0,
  });

  // Compute scene offset for viewBox
  let sceneMinX = Infinity, sceneMinY = Infinity;
  for (const el of elements) { sceneMinX = Math.min(sceneMinX, el.x); sceneMinY = Math.min(sceneMinY, el.y); }
  const svgVB = svg.viewBox?.baseVal;
  const offX = (svgVB?.x ?? 0) - sceneMinX;
  const offY = (svgVB?.y ?? 0) - sceneMinY;

  const fs0 = engine.computeFrame(timeline, 0);
  const cam0 = getCameraRect(cameraFrame, fs0);
  svg.setAttribute('viewBox', `${(cam0.x - cam0.width / 2) + offX} ${(cam0.y - cam0.height / 2) + offY} ${cam0.width} ${cam0.height}`);
  svg.setAttribute('width', String(res.width));
  svg.setAttribute('height', String(res.height));

  // Assign IDs and build CSS keyframes
  const gEls = Array.from(svg.children).filter(
    (c): c is SVGGElement => c instanceof SVGElement && (c.tagName === 'g' || c.tagName === 'use'),
  );

  const animatedIds = new Set<string>();
  for (const track of timeline.tracks) {
    if (track.targetId !== CAMERA_FRAME_TARGET_ID) animatedIds.add(track.targetId);
  }

  // Simple index-based ID assignment (best effort for SVG export)
  gEls.forEach((g, i) => {
    if (i < elements.length) {
      const safeId = elements[i].id.replace(/[^a-zA-Z0-9_-]/g, '_');
      g.setAttribute('id', `el-${safeId}`);
    }
  });

  let css = '';
  let idx = 0;
  for (const elId of animatedIds) {
    const steps: string[] = [];
    for (let i = 0; i <= totalFrames; i++) {
      const time = clipStart + (i / totalFrames) * clipDuration;
      engine.invalidateCache();
      const fs = engine.computeFrame(timeline, time);
      const st = fs.get(elId);
      if (!st) continue;
      const pct = ((i / totalFrames) * 100).toFixed(2);
      const t: string[] = [];
      if (st.translateX !== 0 || st.translateY !== 0) t.push(`translate(${st.translateX}px, ${st.translateY}px)`);
      if (st.rotation !== 0) t.push(`rotate(${st.rotation}deg)`);
      if (st.scaleX !== 1 || st.scaleY !== 1) t.push(`scale(${st.scaleX}, ${st.scaleY})`);
      steps.push(`${pct}% { transform: ${t.join(' ') || 'none'}; opacity: ${st.opacity}; }`);
    }
    if (steps.length > 0) {
      const safeId = elId.replace(/[^a-zA-Z0-9_-]/g, '_');
      css += `@keyframes a_${safeId} { ${steps.join(' ')} }\n`;
      css += `#el-${safeId} { animation: a_${safeId} ${duration}ms linear forwards; transform-origin: center center; transform-box: fill-box; }\n`;
    }
    idx++;
    onProgress?.(idx / animatedIds.size);
  }

  const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
  style.textContent = css;
  svg.insertBefore(style, svg.firstChild);

  const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  bgRect.setAttribute('x', String((cam0.x - cam0.width / 2) + offX));
  bgRect.setAttribute('y', String((cam0.y - cam0.height / 2) + offY));
  bgRect.setAttribute('width', String(cam0.width));
  bgRect.setAttribute('height', String(cam0.height));
  bgRect.setAttribute('fill', '#ffffff');
  svg.insertBefore(bgRect, style.nextSibling);

  const svgStr = new XMLSerializer().serializeToString(svg);
  const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });

  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${project.name || 'animation'}.svg`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export async function exportAnimation(options: ExportOptions): Promise<void> {
  switch (options.format) {
    case 'mp4': return exportMP4(options);
    case 'webm': return exportWebM(options);
    case 'gif': return exportGIF(options);
    case 'svg': return exportAnimatedSVG(options);
  }
}


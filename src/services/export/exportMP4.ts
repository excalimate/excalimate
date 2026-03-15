import { getNonDeletedElements } from '@excalidraw/excalidraw';
import type { ExcalidrawElement, NonDeletedExcalidrawElement } from '@excalidraw/excalidraw/element/types';
import { AnimationEngine } from '../../core/engine/AnimationEngine';
import { useAnimationStore } from '../../stores/animationStore';
import {
  getExportResolution,
  useProjectStore,
} from '../../stores/projectStore';
import { renderFrame } from './renderFrame';
import { QUALITY_SETTINGS, type ExportOptions } from './types';

export async function exportMP4(options: ExportOptions): Promise<void> {
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

  const h264Supported = await VideoEncoder.isConfigSupported({
    codec: 'avc1.640028',
    width: res.width,
    height: res.height,
    bitrate: qs.bitrate,
  }).then((r) => r.supported).catch(() => false);

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
    codec: 'avc1.640028',
    width: res.width,
    height: res.height,
    bitrate: qs.bitrate,
    framerate: fps,
  });

  onProgress?.(0);
  for (let i = 0; i <= totalFrames; i++) {
    const time = clipStart + (i / totalFrames) * clipDuration;
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

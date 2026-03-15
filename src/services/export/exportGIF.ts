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

export async function exportGIF(options: ExportOptions): Promise<void> {
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
    workers: 2,
    quality: qs.gifQuality,
    width: gifW,
    height: gifH,
    workerScript: '/gif.worker.js',
  });

  onProgress?.(0);

  for (let i = 0; i <= totalFrames; i++) {
    const time = clipStart + (i / totalFrames) * clipDuration;
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

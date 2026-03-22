/**
 * Export animation as Lottie JSON or dotLottie.
 */
import { getNonDeletedElements } from '@excalidraw/excalidraw';
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types';
import { useProjectStore, getExportResolution, getFrameHeight } from '../../../stores/projectStore';
import type { CameraFrame } from '../../../stores/projectStore';
import { useAnimationStore } from '../../../stores/animationStore';
import { generateLottie } from './lottieExporter';
import type { ExportOptions } from '../types';

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Compute camera rect that fits all elements, auto-adjusting if content is outside frame. */
/** Get camera rect from camera frame config. */
function getCameraRect(
  cameraFrame: CameraFrame,
): { x: number; y: number; width: number; height: number } {
  const camH = getFrameHeight(cameraFrame);
  return { x: cameraFrame.x, y: cameraFrame.y, width: cameraFrame.width, height: camH };
}

/** Export as Lottie JSON (.json) */
export async function exportLottieJSON(options: ExportOptions): Promise<void> {
  const { fps = 30, onProgress } = options;
  onProgress?.(0.1);

  const project = useProjectStore.getState().project;
  if (!project?.scene) throw new Error('No scene to export');

  const targets = useProjectStore.getState().targets;
  const cameraFrame = useProjectStore.getState().cameraFrame;
  const { timeline, clipStart, clipEnd } = useAnimationStore.getState();
  const res = getExportResolution(cameraFrame.aspectRatio);

  const elements = getNonDeletedElements(project.scene.elements as ExcalidrawElement[]);
  onProgress?.(0.3);

  const camRect = getCameraRect(cameraFrame);

  const lottie = await generateLottie({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    elements: elements as any[],
    targets,
    tracks: timeline.tracks,
    files: project.scene.files ?? {},
    fps,
    clipStart,
    clipEnd,
    cameraFrame: camRect,
    width: res.width,
    height: res.height,
  });
  onProgress?.(0.8);

  const json = JSON.stringify(lottie, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  downloadBlob(blob, 'excalimate-animation.json');
  onProgress?.(1);
}

/** Export as dotLottie (.lottie) */
export async function exportDotLottie(options: ExportOptions): Promise<void> {
  const { fps = 30, onProgress } = options;
  onProgress?.(0.1);

  const project = useProjectStore.getState().project;
  if (!project?.scene) throw new Error('No scene to export');

  const targets = useProjectStore.getState().targets;
  const cameraFrame = useProjectStore.getState().cameraFrame;
  const { timeline, clipStart, clipEnd } = useAnimationStore.getState();
  const res = getExportResolution(cameraFrame.aspectRatio);

  const elements = getNonDeletedElements(project.scene.elements as ExcalidrawElement[]);
  onProgress?.(0.2);

  const camRect = getCameraRect(cameraFrame);

  const lottie = await generateLottie({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    elements: elements as any[],
    targets,
    tracks: timeline.tracks,
    files: project.scene.files ?? {},
    fps,
    clipStart,
    clipEnd,
    cameraFrame: camRect,
    width: res.width,
    height: res.height,
  });
  onProgress?.(0.5);

  // Dynamically import dotlottie-jsto keep it out of the main bundle
  const { DotLottie } = await import('@dotlottie/dotlottie-js');

  const dotLottie = new DotLottie();
  dotLottie.addAnimation({
    id: 'animation',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: lottie as any,
  });

  onProgress?.(0.9);

  await dotLottie.download('excalimate-animation.lottie');
  onProgress?.(1);
}

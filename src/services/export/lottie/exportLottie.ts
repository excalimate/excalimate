import type { ExportTaskContext } from '@excalimate/export-runtime';
import type { PreparedExportContext } from '../context';
import { downloadBlob } from '../download';
import type { ExportOptions } from '../types';
import { generateLottie } from './lottieExporter';

export async function exportLottieJSON(
  context: PreparedExportContext,
  options: ExportOptions,
  task: ExportTaskContext,
): Promise<void> {
  task.report('render', 0.1, 'Mapping compiled timeline to Lottie');
  const lottie = await generateLottieDocument(context, options);
  task.throwIfCancelled();
  task.report('render', 1, 'Lottie layers mapped');
  task.report('encode', 0.5, 'Encoding Lottie JSON');
  const json = JSON.stringify(lottie, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  task.report('encode', 1, 'Lottie JSON encoded');
  task.report('package', 1, 'Lottie JSON ready');
  task.report('download', 0.5, 'Starting Lottie download');
  downloadBlob(blob, `${context.projectName}.json`);
}

export async function exportDotLottie(
  context: PreparedExportContext,
  options: ExportOptions,
  task: ExportTaskContext,
): Promise<void> {
  task.report('render', 0.1, 'Mapping compiled timeline to dotLottie');
  const lottie = await generateLottieDocument(context, options);
  task.throwIfCancelled();
  task.report('render', 1, 'dotLottie layers mapped');
  task.report('encode', 0.2, 'Loading dotLottie packager');
  const { DotLottie } = await import('@dotlottie/dotlottie-js');
  task.throwIfCancelled();
  const dotLottie = new DotLottie();
  type DotLottieAnimation = Parameters<
    typeof dotLottie.addAnimation
  >[0]['data'];
  dotLottie.addAnimation({
    id: 'animation',
    // dotlottie-js narrows assets to images even though Lottie also permits precomps.
    data: lottie as unknown as DotLottieAnimation,
  });
  task.report('encode', 0.7, 'Compressing dotLottie package');
  const buffer = await dotLottie.toArrayBuffer();
  task.throwIfCancelled();
  task.report('encode', 1, 'dotLottie package encoded');
  task.report('package', 1, 'dotLottie package ready');
  task.report('download', 0.5, 'Starting dotLottie download');
  downloadBlob(
    new Blob([buffer], { type: 'application/zip' }),
    `${context.projectName}.lottie`,
  );
}

async function generateLottieDocument(
  context: PreparedExportContext,
  options: ExportOptions,
) {
  const camera = context.playerPackage.playback.camera;
  return generateLottie({
    elements: context.elements.map((element) => ({ ...element })),
    targets: [...context.targets],
    tracks: context.playerPackage.animation.timeline.tracks.map((track) => ({
      ...track,
      keyframes: track.keyframes.map((keyframe) => ({ ...keyframe })),
    })),
    files: context.files,
    fps: context.fps,
    clipStart: context.playerPackage.playback.clipStart,
    clipEnd: context.playerPackage.playback.clipEnd,
    cameraFrame: {
      x: camera.x,
      y: camera.y,
      width: camera.width,
      height: camera.height,
    },
    width: context.width,
    height: context.height,
    embedFontsAsDataUri: false,
    fontEmbeddingModes: options.lottieFontEmbeddingModes ?? ['inline'],
    sampler: context.sampler,
  });
}

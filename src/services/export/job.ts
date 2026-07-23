import {
  createExportJob,
  type ExportJob,
  type ExportPreflightResult,
} from '@excalimate/export-runtime';
import {
  captureExportSnapshot,
  preflightSnapshot,
  prepareExportContext,
} from './context';
import type { ExportOptions } from './types';

export async function estimateAnimationExport(
  options: ExportOptions,
): Promise<ExportPreflightResult> {
  return preflightSnapshot(captureExportSnapshot(options));
}

export async function createAnimationExportJob(
  options: ExportOptions,
): Promise<ExportJob<void>> {
  const snapshot = captureExportSnapshot(options);
  const preflight = await preflightSnapshot(snapshot);
  const job = createExportJob<void>({
    preflight,
    async run(task): Promise<void> {
      const context = await prepareExportContext(snapshot, preflight, task);
      task.throwIfCancelled();
      switch (options.format) {
        case 'mp4':
          return (await import('./exportMP4')).exportMP4(
            context,
            options,
            task,
          );
        case 'webm':
          return (await import('./exportWebM')).exportWebM(
            context,
            options,
            task,
          );
        case 'gif':
          return (await import('./exportGIF')).exportGIF(
            context,
            options,
            task,
          );
        case 'svg':
          return (await import('./exportSVG')).exportAnimatedSVG(
            context,
            options,
            task,
          );
        case 'lottie':
          return (await import('./lottie/exportLottie')).exportLottieJSON(
            context,
            options,
            task,
          );
        case 'dotlottie':
          return (await import('./lottie/exportLottie')).exportDotLottie(
            context,
            options,
            task,
          );
      }
    },
  });
  if (options.onProgress || options.onJobProgress) {
    job.subscribe((state) => {
      options.onProgress?.(state.progress.progress);
      options.onJobProgress?.(state.progress);
    });
  }
  return job;
}

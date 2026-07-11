import type { ExportTaskContext } from '@excalimate/export-runtime';
import type { PreparedExportContext } from './context';
import { downloadBlob } from './download';
import { renderRasterFrames } from './rasterFrames';
import { QUALITY_SETTINGS, type ExportOptions } from './types';

interface GifEncoder {
  addFrame(
    canvas: HTMLCanvasElement,
    options: { delay: number; copy: boolean },
  ): void;
  on(event: 'finished', listener: (blob: Blob) => void): void;
  on(event: 'progress', listener: (progress: number) => void): void;
  render(): void;
  abort(): void;
}

interface GifConstructor {
  new (options: {
    workers: number;
    quality: number;
    width: number;
    height: number;
    workerScript: string;
  }): GifEncoder;
}

export async function exportGIF(
  context: PreparedExportContext,
  options: ExportOptions,
  task: ExportTaskContext,
): Promise<void> {
  const quality = QUALITY_SETTINGS[options.quality ?? 'medium'].gifQuality;
  const module = await import('gif.js');
  const GIF = module.default as unknown as GifConstructor;
  const gif = new GIF({
    workers: 2,
    quality,
    width: context.width,
    height: context.height,
    workerScript: '/gif.worker.js',
  });
  task.defer(() => gif.abort());

  await renderRasterFrames(context, task, (canvas) => {
    gif.addFrame(canvas, {
      delay: Math.round(1000 / context.fps),
      copy: true,
    });
  });

  task.report('encode', 0, 'Encoding GIF frames');
  const blob = await new Promise<Blob>((resolve, reject) => {
    const onAbort = (): void => {
      gif.abort();
      reject(new DOMException('Export cancelled', 'AbortError'));
    };
    task.signal.addEventListener('abort', onAbort, { once: true });
    gif.on('progress', (progress) => {
      task.report('encode', progress, 'Encoding GIF frames');
    });
    gif.on('finished', (result) => {
      task.signal.removeEventListener('abort', onAbort);
      resolve(result);
    });
    gif.render();
  });
  task.throwIfCancelled();
  task.report('encode', 1, 'GIF encoding complete');
  task.report('package', 1, 'GIF file ready');
  task.report('download', 0.5, 'Starting GIF download');
  downloadBlob(blob, `${context.projectName}.gif`);
}

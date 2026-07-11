import type { ExportTaskContext } from '@excalimate/export-runtime';
import { SvgSceneAdapter } from '@excalimate/player-runtime';
import type { PreparedExportContext } from './context';
import { renderFrame } from './renderFrame';

export async function renderRasterFrames(
  context: PreparedExportContext,
  task: ExportTaskContext,
  consume: (
    canvas: HTMLCanvasElement,
    frameIndex: number,
  ) => void | Promise<void>,
): Promise<void> {
  const canvas = document.createElement('canvas');
  canvas.width = context.width;
  canvas.height = context.height;
  const container = document.createElement('div');
  const adapter = new SvgSceneAdapter(container, context.playerPackage);
  task.defer(() => adapter.destroy());
  const total = context.sampler.sampleCount;
  task.report('render', 0, `Rendering ${total.toLocaleString()} frames`);

  for (let index = 0; index < total; index += 1) {
    task.throwIfCancelled();
    const frameState = await context.sampleFrame(index, task.signal);
    await renderFrame(
      adapter,
      frameState,
      context.width,
      context.height,
      canvas,
      context.options.theme ?? 'light',
      task.signal,
    );
    await consume(canvas, index);
    task.report(
      'render',
      (index + 1) / total,
      `Rendered ${index + 1} of ${total} frames`,
    );
    await task.yield();
  }
}

import {
  compileAnimatedSvg,
  type ExportTaskContext,
} from '@excalimate/export-runtime';
import type { PreparedExportContext } from './context';
import { downloadBlob } from './download';
import type { ExportOptions } from './types';

export async function exportAnimatedSVG(
  context: PreparedExportContext,
  options: ExportOptions,
  task: ExportTaskContext,
): Promise<void> {
  task.report('render', 0.1, 'Compiling source keyframes');
  const result = compileAnimatedSvg(context.playerPackage, {
    profile: options.svgProfile ?? 'css-keyframes',
    theme: options.theme,
  });
  task.throwIfCancelled();
  task.report(
    'render',
    1,
    `Compiled ${result.emittedKeyframeCount.toLocaleString()} SVG keyframe declarations`,
  );
  task.report('encode', 1, 'SVG animation encoded');
  task.report('package', 0.5, 'Serializing sanitized animated SVG');
  const blob = new Blob([result.svg], {
    type: 'image/svg+xml;charset=utf-8',
  });
  task.report('package', 1, 'Animated SVG ready');
  task.report('download', 0.5, 'Starting SVG download');
  downloadBlob(blob, `${context.projectName}.svg`);
}

export {
  type ExportFormat,
  type ExportOptions,
  type ExportQuality,
} from './export/types';
import type { ExportOptions } from './export/types';

export async function exportAnimation(options: ExportOptions): Promise<void> {
  switch (options.format) {
    case 'webm':
      return (await import('./export/exportWebM')).exportWebM(options);
    case 'mp4':
      return (await import('./export/exportMP4')).exportMP4(options);
    case 'gif':
      return (await import('./export/exportGIF')).exportGIF(options);
    case 'svg':
      return (await import('./export/exportSVG')).exportAnimatedSVG(options);
  }
}

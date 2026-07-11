export {
  type ExportFormat,
  type LottieFontEmbeddingMode,
  type ExportOptions,
  type ExportQuality,
} from './export/types';
import type { ExportOptions } from './export/types';
export type {
  ExportJob,
  ExportPreflightResult,
  ExportProgress,
} from '@excalimate/export-runtime';

export async function exportAnimation(options: ExportOptions): Promise<void> {
  const job = await createExportJob(options);
  return job.start();
}

export async function createExportJob(options: ExportOptions) {
  return (await import('./export/job')).createAnimationExportJob(options);
}

export async function estimateExport(options: ExportOptions) {
  return (await import('./export/job')).estimateAnimationExport(options);
}

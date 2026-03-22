/**
 * Scenario D: SSE Bandwidth Measurement
 * Runs all three scenarios for a given scene size and compares SSE traffic.
 */
import type { FixtureScene } from '../fixtures/generator.js';
import { runIndividualTools } from './individual-tools.bench.js';
import { runBatchTools } from './batch-tools.bench.js';
import { runCompositeTool } from './composite-tool.bench.js';
import type { BenchmarkResult } from '../harness/metrics.js';

export interface BandwidthComparison {
  sceneSize: string;
  individual: BenchmarkResult;
  batch: BenchmarkResult;
  composite: BenchmarkResult;
}

export async function runBandwidthComparison(
  scene: FixtureScene,
  sceneSize: string,
): Promise<BandwidthComparison> {
  const individual = await runIndividualTools(scene, sceneSize);
  const batch = await runBatchTools(scene, sceneSize);
  const composite = await runCompositeTool(scene, sceneSize);
  return { sceneSize, individual, batch, composite };
}

export function formatBandwidthReport(comparisons: BandwidthComparison[]): string {
  const lines: string[] = ['', '=== SSE Bandwidth Comparison ===', ''];

  for (const c of comparisons) {
    lines.push(`--- ${c.sceneSize} ---`);
    lines.push(
      `${''.padEnd(14)} ${'Calls'.padStart(6)} ${'SSE Msgs'.padStart(9)} ${'Raw(KB)'.padStart(10)} ${'Gzip(KB)'.padStart(10)} ${'Time(ms)'.padStart(10)}`,
    );
    for (const [label, r] of [
      ['Individual', c.individual],
      ['Batch', c.batch],
      ['Composite', c.composite],
    ] as const) {
      lines.push(
        `${label.padEnd(14)} ${String(r.toolCalls).padStart(6)} ${String(r.sseMessageCount).padStart(9)} ${(r.sseRawBytes / 1024).toFixed(1).padStart(10)} ${(r.sseGzipBytes / 1024).toFixed(1).padStart(10)} ${r.totalTimeMs.toFixed(1).padStart(10)}`,
      );
    }
    lines.push('');
  }

  return lines.join('\n');
}

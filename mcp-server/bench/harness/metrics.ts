import type { ToolCallResult } from './McpTestClient.js';
import type { TrafficReport } from './SseTrafficMonitor.js';
import { getSharedStateJSON } from '../../src/server/stateContext.js';

export interface BenchmarkResult {
  scenario: string;
  sceneSize: string;
  toolCalls: number;
  totalTimeMs: number;
  perToolTimeMs: number[];
  sseMessageCount: number;
  sseRawBytes: number;
  sseGzipBytes: number;
  compressionRatio: number;
  stateJsonBytes: number;
  elementCount: number;
  trackCount: number;
  keyframeCount: number;
  peakMemoryMB: number;
}

export function collectMetrics(
  scenario: string,
  sceneSize: string,
  toolResults: ToolCallResult[],
  totalTimeMs: number,
  traffic: TrafficReport,
  state: { elementCount: number; trackCount: number; keyframeCount: number },
): BenchmarkResult {
  const stateJson = getSharedStateJSON();
  const memUsage = process.memoryUsage();

  return {
    scenario,
    sceneSize,
    toolCalls: toolResults.length,
    totalTimeMs: Math.round(totalTimeMs * 100) / 100,
    perToolTimeMs: toolResults.map(r => Math.round(r.durationMs * 100) / 100),
    sseMessageCount: traffic.messageCount,
    sseRawBytes: traffic.totalRawBytes,
    sseGzipBytes: traffic.totalCompressedBytes,
    compressionRatio: Math.round(traffic.compressionRatio * 1000) / 1000,
    stateJsonBytes: Buffer.byteLength(stateJson, 'utf8'),
    elementCount: state.elementCount,
    trackCount: state.trackCount,
    keyframeCount: state.keyframeCount,
    peakMemoryMB: Math.round(memUsage.rss / 1024 / 1024 * 10) / 10,
  };
}

export function formatTable(results: BenchmarkResult[]): string {
  const cols = [
    { key: 'scenario', label: 'Scenario', width: 18 },
    { key: 'sceneSize', label: 'Size', width: 12 },
    { key: 'toolCalls', label: 'Calls', width: 6 },
    { key: 'totalTimeMs', label: 'Time(ms)', width: 10 },
    { key: 'sseMessageCount', label: 'SSE Msgs', width: 9 },
    { key: 'sseRawBytes', label: 'Raw(B)', width: 10 },
    { key: 'sseGzipBytes', label: 'Gzip(B)', width: 10 },
    { key: 'stateJsonBytes', label: 'State(B)', width: 10 },
    { key: 'peakMemoryMB', label: 'Mem(MB)', width: 8 },
  ];

  const sep = '+' + cols.map(c => '-'.repeat(c.width + 2)).join('+') + '+';
  const header = '|' + cols.map(c => ` ${c.label.padEnd(c.width)} `).join('|') + '|';
  const lines = [sep, header, sep];

  for (const r of results) {
    const row = '|' + cols.map(c => {
      const val = String((r as Record<string, unknown>)[c.key] ?? '');
      return ` ${val.padEnd(c.width)} `;
    }).join('|') + '|';
    lines.push(row);
  }
  lines.push(sep);

  return lines.join('\n');
}

export function formatComparison(
  label1: string,
  results1: BenchmarkResult[],
  label2: string,
  results2: BenchmarkResult[],
): string {
  const lines: string[] = [];
  for (let i = 0; i < Math.min(results1.length, results2.length); i++) {
    const a = results1[i];
    const b = results2[i];
    lines.push(`\n=== ${a.sceneSize} ===`);
    lines.push(`${'Metric'.padEnd(20)} ${label1.padEnd(12)} ${label2.padEnd(12)} Change`);
    lines.push('-'.repeat(60));

    const metrics: [string, keyof BenchmarkResult][] = [
      ['Tool calls', 'toolCalls'],
      ['Total time (ms)', 'totalTimeMs'],
      ['SSE messages', 'sseMessageCount'],
      ['SSE raw bytes', 'sseRawBytes'],
      ['SSE gzip bytes', 'sseGzipBytes'],
      ['State bytes', 'stateJsonBytes'],
      ['Peak memory (MB)', 'peakMemoryMB'],
    ];

    for (const [label, key] of metrics) {
      const va = a[key] as number;
      const vb = b[key] as number;
      const change = va !== 0 ? Math.round((vb - va) / va * 100) : 0;
      const sign = change > 0 ? '+' : '';
      lines.push(
        `${label.padEnd(20)} ${String(va).padEnd(12)} ${String(vb).padEnd(12)} ${sign}${change}%`,
      );
    }
  }

  return lines.join('\n');
}

// ── Markdown report with visual bar charts ────────────────────

function bar(value: number, max: number, width = 20): string {
  const filled = max > 0 ? Math.round((value / max) * width) : 0;
  return '█'.repeat(Math.min(filled, width)) + '░'.repeat(width - Math.min(filled, width));
}

function fmtBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * Generate a visual Markdown report suitable for GitHub Actions summary or PR comment.
 */
export function formatMarkdownReport(results: BenchmarkResult[]): string {
  const lines: string[] = [];
  lines.push('# 📊 MCP Server Benchmark Results\n');

  // Group by scene size
  const sizes = [...new Set(results.map(r => r.sceneSize))];
  const scenarios = [...new Set(results.map(r => r.scenario))];

  // ── Summary table ──
  lines.push('## Summary\n');
  lines.push('| Size | Scenario | Calls | Time | SSE Msgs | Gzip Traffic | State Size |');
  lines.push('|------|----------|------:|-----:|---------:|-------------:|-----------:|');
  for (const r of results) {
    lines.push(
      `| ${r.sceneSize} | ${r.scenario} | ${r.toolCalls} | ${r.totalTimeMs.toFixed(1)}ms | ${r.sseMessageCount} | ${fmtBytes(r.sseGzipBytes)} | ${fmtBytes(r.stateJsonBytes)} |`,
    );
  }

  // ── Visual comparisons per size ──
  for (const size of sizes) {
    const sizeResults = results.filter(r => r.sceneSize === size);
    if (sizeResults.length < 2) continue;

    lines.push(`\n## ${size.charAt(0).toUpperCase() + size.slice(1)} Scene\n`);

    // Tool calls chart
    const maxCalls = Math.max(...sizeResults.map(r => r.toolCalls));
    lines.push('### Tool Calls\n');
    lines.push('```');
    for (const r of sizeResults) {
      lines.push(`${r.scenario.padEnd(12)} ${bar(r.toolCalls, maxCalls)} ${r.toolCalls}`);
    }
    lines.push('```\n');

    // Time chart
    const maxTime = Math.max(...sizeResults.map(r => r.totalTimeMs));
    lines.push('### Execution Time\n');
    lines.push('```');
    for (const r of sizeResults) {
      lines.push(`${r.scenario.padEnd(12)} ${bar(r.totalTimeMs, maxTime)} ${r.totalTimeMs.toFixed(1)}ms`);
    }
    lines.push('```\n');

    // Bandwidth chart
    const maxBw = Math.max(...sizeResults.map(r => r.sseGzipBytes));
    lines.push('### SSE Bandwidth (gzip)\n');
    lines.push('```');
    for (const r of sizeResults) {
      lines.push(`${r.scenario.padEnd(12)} ${bar(r.sseGzipBytes, maxBw)} ${fmtBytes(r.sseGzipBytes)}`);
    }
    lines.push('```\n');
  }

  // ── Key improvements ──
  if (scenarios.includes('individual') && scenarios.includes('composite')) {
    lines.push('## 🚀 Key Improvements\n');
    for (const size of sizes) {
      const ind = results.find(r => r.sceneSize === size && r.scenario === 'individual');
      const comp = results.find(r => r.sceneSize === size && r.scenario === 'composite');
      if (!ind || !comp) continue;

      const callReduction = ind.toolCalls > 0 ? Math.round((1 - comp.toolCalls / ind.toolCalls) * 100) : 0;
      const timeReduction = ind.totalTimeMs > 0 ? Math.round((1 - comp.totalTimeMs / ind.totalTimeMs) * 100) : 0;

      lines.push(
        `- **${size}**: ${callReduction}% fewer tool calls, ${timeReduction}% faster execution`,
      );
    }
    lines.push('');
  }

  return lines.join('\n');
}

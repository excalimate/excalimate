#!/usr/bin/env tsx
/**
 * MCP Server Benchmark Runner
 *
 * Usage:
 *   npx tsx bench/run.ts                          # Run all scenarios, all sizes
 *   npx tsx bench/run.ts --scenario composite      # Specific scenario
 *   npx tsx bench/run.ts --size medium             # Specific size
 *   npx tsx bench/run.ts --json                    # JSON output
 *   npx tsx bench/run.ts --iterations 5            # Multiple iterations
 */
import { ALL_SCENES, type SceneSize } from './fixtures/scenes.js';
import { runIndividualTools } from './scenarios/individual-tools.bench.js';
import { runBatchTools } from './scenarios/batch-tools.bench.js';
import { runCompositeTool } from './scenarios/composite-tool.bench.js';
import { runBandwidthComparison, formatBandwidthReport } from './scenarios/sse-bandwidth.bench.js';
import { formatTable, formatMarkdownReport, type BenchmarkResult } from './harness/metrics.js';

const args = process.argv.slice(2);
const flagValue = (flag: string): string | undefined => {
  const idx = args.indexOf(flag);
  return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : undefined;
};
const hasFlag = (flag: string) => args.includes(flag);

const jsonOutput = hasFlag('--json');
const markdownOutput = hasFlag('--markdown');
const outputFile = flagValue('--output');
const scenarioFilter = flagValue('--scenario');
const sizeFilter = flagValue('--size') as SceneSize | undefined;
const iterations = parseInt(flagValue('--iterations') ?? '1', 10);
const bandwidthMode = hasFlag('--bandwidth');

const scenarios: Record<string, (scene: typeof ALL_SCENES[SceneSize], size: string) => Promise<BenchmarkResult>> = {
  individual: runIndividualTools,
  batch: runBatchTools,
  composite: runCompositeTool,
};

async function main() {
  const sizes = sizeFilter ? [sizeFilter] : (Object.keys(ALL_SCENES) as SceneSize[]);
  const scenarioNames = scenarioFilter ? [scenarioFilter] : Object.keys(scenarios);
  const allResults: BenchmarkResult[] = [];

  if (bandwidthMode) {
    const comparisons = [];
    for (const size of sizes) {
      if (!jsonOutput) process.stdout.write(`Bandwidth: ${size}...`);
      const c = await runBandwidthComparison(ALL_SCENES[size], size);
      comparisons.push(c);
      if (!jsonOutput) process.stdout.write(' done\n');
    }
    if (jsonOutput) {
      console.log(JSON.stringify(comparisons, null, 2));
    } else {
      console.log(formatBandwidthReport(comparisons));
    }
    return;
  }

  for (const name of scenarioNames) {
    const runner = scenarios[name];
    if (!runner) {
      console.error(`Unknown scenario: ${name}`);
      continue;
    }

    for (const size of sizes) {
      for (let iter = 0; iter < iterations; iter++) {
        if (!jsonOutput) {
          const iterLabel = iterations > 1 ? ` [${iter + 1}/${iterations}]` : '';
          process.stdout.write(`${name} / ${size}${iterLabel}...`);
        }

        const result = await runner(ALL_SCENES[size], size);
        allResults.push(result);

        if (!jsonOutput && !markdownOutput) {
          process.stdout.write(` ${result.totalTimeMs.toFixed(1)}ms, ${result.sseMessageCount} SSE msgs, ${(result.sseGzipBytes / 1024).toFixed(1)}KB\n`);
        }
      }
    }
  }

  // Generate output
  let output: string;
  if (jsonOutput) {
    output = JSON.stringify(allResults, null, 2);
  } else if (markdownOutput) {
    output = formatMarkdownReport(allResults);
  } else {
    output = '\n' + formatTable(allResults);
  }

  // Write to file or stdout
  if (outputFile) {
    const { writeFileSync } = await import('node:fs');
    writeFileSync(outputFile, output, 'utf8');
    if (!jsonOutput && !markdownOutput) console.log(output);
    console.log(`\nResults written to ${outputFile}`);
  } else {
    console.log(output);
  }

  // Also write to $GITHUB_STEP_SUMMARY if running in GitHub Actions
  if (process.env.GITHUB_STEP_SUMMARY) {
    const { appendFileSync } = await import('node:fs');
    const md = markdownOutput ? output : formatMarkdownReport(allResults);
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, md, 'utf8');
  }
}

main().catch((err) => {
  console.error('Benchmark failed:', err);
  process.exit(1);
});

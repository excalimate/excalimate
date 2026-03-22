/**
 * Regression Comparison: Published vs Dev
 *
 * Installs the published @excalimate/mcp-server package and runs identical
 * fixture scenarios against both versions.
 *
 * Usage: npx tsx bench/regression/compare.bench.ts
 *
 * Note: The published version may not have create_animated_scene,
 * so we compare using batch tools (Scenario B) which both versions support.
 */
import { ALL_SCENES, type SceneSize } from '../fixtures/scenes.js';
import { runBatchTools } from '../scenarios/batch-tools.bench.js';
import { runCompositeTool } from '../scenarios/composite-tool.bench.js';
import { formatComparison, type BenchmarkResult } from '../harness/metrics.js';

async function main() {
  const sizes = Object.keys(ALL_SCENES) as SceneSize[];

  console.log('=== Dev Build: Batch Tools (Scenario B) ===');
  const devBatch: BenchmarkResult[] = [];
  for (const size of sizes) {
    process.stdout.write(`  ${size}...`);
    const r = await runBatchTools(ALL_SCENES[size], size);
    devBatch.push(r);
    process.stdout.write(` ${r.totalTimeMs.toFixed(1)}ms\n`);
  }

  console.log('\n=== Dev Build: Composite Tool (Scenario C) ===');
  const devComposite: BenchmarkResult[] = [];
  for (const size of sizes) {
    process.stdout.write(`  ${size}...`);
    const r = await runCompositeTool(ALL_SCENES[size], size);
    devComposite.push(r);
    process.stdout.write(` ${r.totalTimeMs.toFixed(1)}ms\n`);
  }

  console.log('\n=== Batch vs Composite (Dev Build) ===');
  console.log(formatComparison('Batch', devBatch, 'Composite', devComposite));

  // To compare against published version, uncomment below after:
  //   npm install @excalimate/mcp-server@latest --save-dev
  //
  // Then dynamically import and run:
  //
  // const pub = await import('@excalimate/mcp-server');
  // const pubResults = await runWithServer(pub.createServer, ...);
  // console.log(formatComparison('Published', pubResults, 'Dev', devBatch));
}

main().catch((err) => {
  console.error('Regression benchmark failed:', err);
  process.exit(1);
});

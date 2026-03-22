/**
 * Scenario C: Composite Tool
 * Single create_animated_scene call with all data.
 */
import type { FixtureScene } from '../fixtures/generator.js';
import { McpTestClient } from '../harness/McpTestClient.js';
import { SseTrafficMonitor } from '../harness/SseTrafficMonitor.js';
import { MemoryCheckpointStore } from '../harness/MemoryCheckpointStore.js';
import { collectMetrics, type BenchmarkResult } from '../harness/metrics.js';
import { getSharedState } from '../../src/server/stateContext.js';

export async function runCompositeTool(scene: FixtureScene, sceneSize: string): Promise<BenchmarkResult> {
  const store = new MemoryCheckpointStore();
  const monitor = new SseTrafficMonitor();
  const client = await McpTestClient.create(store, monitor.createListener());

  const args: Record<string, unknown> = {
    elements: JSON.stringify(scene.elements),
    keyframes: JSON.stringify(scene.keyframes),
    clipEnd: scene.clipEnd,
    cameraFrame: scene.cameraFrame,
  };
  if (scene.sequences.length > 0) {
    args.sequences = JSON.stringify(scene.sequences);
  }

  const start = performance.now();
  const result = await client.callTool('create_animated_scene', args);
  const totalDurationMs = performance.now() - start;

  await new Promise(r => setTimeout(r, 100));

  const state = getSharedState();
  const kfCount = state.timeline.tracks.reduce((s, t) => s + t.keyframes.length, 0);

  const metrics = collectMetrics(
    'composite',
    sceneSize,
    [result],
    totalDurationMs,
    monitor.report(),
    { elementCount: state.scene.elements.length, trackCount: state.timeline.tracks.length, keyframeCount: kfCount },
  );

  await client.close();
  return metrics;
}

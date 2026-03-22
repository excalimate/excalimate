/**
 * Scenario B: Batch Tools
 * create_scene + add_keyframes_batch + set_clip_range + set_camera_frame
 */
import type { FixtureScene } from '../fixtures/generator.js';
import { McpTestClient } from '../harness/McpTestClient.js';
import { SseTrafficMonitor } from '../harness/SseTrafficMonitor.js';
import { MemoryCheckpointStore } from '../harness/MemoryCheckpointStore.js';
import { collectMetrics, type BenchmarkResult } from '../harness/metrics.js';
import { getSharedState } from '../../src/server/stateContext.js';

export async function runBatchTools(scene: FixtureScene, sceneSize: string): Promise<BenchmarkResult> {
  const store = new MemoryCheckpointStore();
  const monitor = new SseTrafficMonitor();
  const client = await McpTestClient.create(store, monitor.createListener());

  const calls: { name: string; args: Record<string, unknown> }[] = [
    { name: 'create_scene', args: { elements: JSON.stringify(scene.elements) } },
    { name: 'add_keyframes_batch', args: { keyframes: JSON.stringify(scene.keyframes) } },
    { name: 'set_clip_range', args: { start: 0, end: scene.clipEnd } },
    { name: 'set_camera_frame', args: scene.cameraFrame },
  ];

  const { totalDurationMs, results } = await client.callToolSequence(calls);
  await new Promise(r => setTimeout(r, 100));

  const state = getSharedState();
  const kfCount = state.timeline.tracks.reduce((s, t) => s + t.keyframes.length, 0);

  const metrics = collectMetrics(
    'batch',
    sceneSize,
    results,
    totalDurationMs,
    monitor.report(),
    { elementCount: state.scene.elements.length, trackCount: state.timeline.tracks.length, keyframeCount: kfCount },
  );

  await client.close();
  return metrics;
}

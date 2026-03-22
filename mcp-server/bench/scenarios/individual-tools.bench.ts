/**
 * Scenario A: Individual Tools (baseline)
 * Old workflow — create_scene + N × add_keyframe + set_clip_range + set_camera_frame
 */
import type { FixtureScene } from '../fixtures/generator.js';
import { McpTestClient } from '../harness/McpTestClient.js';
import { SseTrafficMonitor } from '../harness/SseTrafficMonitor.js';
import { MemoryCheckpointStore } from '../harness/MemoryCheckpointStore.js';
import { collectMetrics, type BenchmarkResult } from '../harness/metrics.js';
import { getSharedState } from '../../src/server/stateContext.js';

export async function runIndividualTools(scene: FixtureScene, sceneSize: string): Promise<BenchmarkResult> {
  const store = new MemoryCheckpointStore();
  const monitor = new SseTrafficMonitor();
  const client = await McpTestClient.create(store, monitor.createListener());

  const calls: { name: string; args: Record<string, unknown> }[] = [];

  // 1. create_scene
  calls.push({ name: 'create_scene', args: { elements: JSON.stringify(scene.elements) } });

  // 2. Individual keyframes
  for (const kf of scene.keyframes) {
    calls.push({
      name: 'add_keyframe',
      args: {
        targetId: kf.targetId,
        property: kf.property,
        time: kf.time,
        value: kf.value,
        ...(kf.easing ? { easing: kf.easing } : {}),
      },
    });
  }

  // 3. set_clip_range
  calls.push({ name: 'set_clip_range', args: { start: 0, end: scene.clipEnd } });

  // 4. set_camera_frame
  calls.push({ name: 'set_camera_frame', args: scene.cameraFrame });

  // Wait for SSE debounce to flush
  const { totalDurationMs, results } = await client.callToolSequence(calls);
  await new Promise(r => setTimeout(r, 100));

  const state = getSharedState();
  const kfCount = state.timeline.tracks.reduce((s, t) => s + t.keyframes.length, 0);

  const metrics = collectMetrics(
    'individual',
    sceneSize,
    results,
    totalDurationMs,
    monitor.report(),
    { elementCount: state.scene.elements.length, trackCount: state.timeline.tracks.length, keyframeCount: kfCount },
  );

  await client.close();
  return metrics;
}

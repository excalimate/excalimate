import type { FixtureScene } from '../fixtures/generator.js';
import { McpTestClient } from '../harness/McpTestClient.js';
import { MemoryCheckpointStore } from '../harness/MemoryCheckpointStore.js';
import { collectMetrics } from '../harness/metrics.js';
import type { BenchmarkResult } from '../harness/metrics.js';
import { SseTrafficMonitor } from '../harness/SseTrafficMonitor.js';

export async function runActionGeneration(
  scene: FixtureScene,
  sceneSize: string,
): Promise<BenchmarkResult> {
  const store = new MemoryCheckpointStore();
  const monitor = new SseTrafficMonitor();
  const client = await McpTestClient.create(
    store,
    monitor.createListener(),
  );
  const { totalDurationMs, results } = await client.callToolSequence([
    {
      name: 'create_scene',
      args: { elements: scene.elements },
    },
    {
      name: 'auto_animate',
      args: {
        scope: { elementIds: scene.elements.map((element) => element.id) },
        style: { intensity: 'balanced' },
      },
    },
    {
      name: 'get_action_sequence',
      args: {},
    },
  ]);
  const state = client.getState();
  const keyframeCount = state.timeline.tracks.reduce(
    (total, track) => total + track.keyframes.length,
    0,
  );
  const metrics = collectMetrics(
    'actions',
    sceneSize,
    results,
    totalDurationMs,
    monitor.report(),
    {
      elementCount: state.scene.elements.length,
      trackCount: state.timeline.tracks.length,
      keyframeCount,
      actionCount: state.authoring?.actions.length ?? 0,
    },
    client.getStateJSON(),
  );

  await client.close();
  return metrics;
}

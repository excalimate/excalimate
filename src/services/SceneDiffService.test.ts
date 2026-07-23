import { describe, expect, it, vi } from 'vitest';
import type { SceneState } from '@excalimate/project-schema';
import type { SceneDiffWorkerLike } from './SceneDiffService';
import { SCENE_DIFF_WORKER_THRESHOLD, analyzeSceneDiff } from './SceneDiffService';

function state(id: string, count: number): SceneState {
  return {
    id,
    name: id,
    createdAt: '2026-01-01T00:00:00.000Z',
    elements: Array.from({ length: count }, (_, index) => ({
      id: `element-${index}`,
      type: 'rectangle',
      x: index * 10,
      y: 0,
      width: 10,
      height: 10,
      angle: 0,
      opacity: 1,
      present: true,
      groupIds: [],
      boundElementIds: [],
    })),
  };
}

class FakeWorker implements SceneDiffWorkerLike {
  readonly posted: unknown[] = [];
  readonly terminate = vi.fn();
  private readonly listeners = new Map<string, EventListener>();

  postMessage(message: unknown): void {
    this.posted.push(message);
  }

  addEventListener(type: 'message' | 'error', listener: EventListener): void {
    this.listeners.set(type, listener);
  }

  removeEventListener(type: 'message' | 'error'): void {
    this.listeners.delete(type);
  }
}

describe('SceneDiffService', () => {
  it('keeps small comparisons local', async () => {
    const workerFactory = vi.fn();
    const result = await analyzeSceneDiff(state('from', 2), state('to', 2), {
      workerFactory,
    });

    expect(result.matches).toHaveLength(2);
    expect(workerFactory).not.toHaveBeenCalled();
  });

  it('sends only sparse state metadata to a local worker and cancels by termination', async () => {
    const worker = new FakeWorker();
    const controller = new AbortController();
    const pending = analyzeSceneDiff(
      state('from', SCENE_DIFF_WORKER_THRESHOLD),
      state('to', SCENE_DIFF_WORKER_THRESHOLD),
      {
        signal: controller.signal,
        workerFactory: () => worker,
      },
    );
    controller.abort();

    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    expect(worker.terminate).toHaveBeenCalledOnce();
    expect(worker.posted).toHaveLength(1);
    expect(JSON.stringify(worker.posted[0])).not.toMatch(/files|project|https?:\/\//);
  });

  it('rejects an already cancelled request without creating a worker', async () => {
    const controller = new AbortController();
    controller.abort();
    const workerFactory = vi.fn();

    await expect(
      analyzeSceneDiff(
        state('from', SCENE_DIFF_WORKER_THRESHOLD),
        state('to', SCENE_DIFF_WORKER_THRESHOLD),
        { signal: controller.signal, workerFactory },
      ),
    ).rejects.toMatchObject({ name: 'AbortError' });
    expect(workerFactory).not.toHaveBeenCalled();
  });
});

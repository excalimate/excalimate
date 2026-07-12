import { describe, expect, it } from 'vitest';
import type {
  ExportWorkerLike,
  ExportWorkerEventMap,
  FrameSamplerWorkerRequest,
  FrameSamplerWorkerResponse,
} from './workerSampler.js';
import { WorkerFrameSampler } from './workerSampler.js';
import type { FrameSamplerSpec } from './sampler.js';

class FakeWorker implements ExportWorkerLike {
  terminated = false;
  private readonly startupFailure: 'error' | 'messageerror' | 'timeout' | null;
  constructor(startupFailure: 'error' | 'messageerror' | 'timeout' | null = null) {
    this.startupFailure = startupFailure;
  }
  private messageListeners = new Set<
    (event: MessageEvent<FrameSamplerWorkerResponse>) => void
  >();
  private errorListeners = new Set<(event: ErrorEvent) => void>();
  private messageErrorListeners = new Set<(event: MessageEvent<unknown>) => void>();

  postMessage(message: FrameSamplerWorkerRequest): void {
    if (message.type === 'init') {
      if (this.startupFailure === 'error') {
        this.emitError('startup failed');
        return;
      }
      if (this.startupFailure === 'messageerror') {
        this.emitMessageError();
        return;
      }
      if (this.startupFailure === 'timeout') return;
      this.emit({
        type: 'ready',
        requestId: message.requestId,
        frameCount: 10,
        sampleCount: 11,
      });
    } else if (message.type === 'sample') {
      this.emit({
        type: 'frame',
        requestId: message.requestId,
        frame: [
          [
            'element',
            {
              targetId: 'element',
              opacity: 1,
              translateX: message.frameIndex,
              translateY: 0,
              scaleX: 1,
              scaleY: 1,
              rotation: 0,
              drawProgress: 1,
            },
          ],
        ],
      });
    }
  }

  addEventListener<K extends keyof ExportWorkerEventMap>(
    type: K,
    listener: (event: ExportWorkerEventMap[K]) => void,
  ): void {
    if (type === 'message') {
      this.messageListeners.add(
        listener as (event: MessageEvent<FrameSamplerWorkerResponse>) => void,
      );
    } else if (type === 'error') {
      this.errorListeners.add(listener as (event: ErrorEvent) => void);
    } else {
      this.messageErrorListeners.add(
        listener as (event: MessageEvent<unknown>) => void,
      );
    }
  }

  removeEventListener<K extends keyof ExportWorkerEventMap>(
    type: K,
    listener: (event: ExportWorkerEventMap[K]) => void,
  ): void {
    if (type === 'message') {
      this.messageListeners.delete(
        listener as (event: MessageEvent<FrameSamplerWorkerResponse>) => void,
      );
    } else if (type === 'error') {
      this.errorListeners.delete(listener as (event: ErrorEvent) => void);
    } else {
      this.messageErrorListeners.delete(
        listener as (event: MessageEvent<unknown>) => void,
      );
    }
  }

  terminate(): void {
    this.terminated = true;
  }

  private emit(response: FrameSamplerWorkerResponse): void {
    const event = { data: response } as MessageEvent<FrameSamplerWorkerResponse>;
    for (const listener of this.messageListeners) listener(event);
  }

  private emitError(message: string): void {
    const event = { message } as ErrorEvent;
    for (const listener of this.errorListeners) listener(event);
  }

  private emitMessageError(): void {
    const event = { data: null } as MessageEvent<unknown>;
    for (const listener of this.messageErrorListeners) listener(event);
  }
}

const spec: FrameSamplerSpec = {
  timeline: {
    id: 'timeline',
    name: 'Worker',
    duration: 1000,
    fps: 10,
    tracks: [],
  },
  clipStart: 0,
  clipEnd: 1000,
  fps: 10,
};

describe('worker frame sampler', () => {
  it('round-trips frame state and terminates worker resources', async () => {
    const worker = new FakeWorker();
    const sampler = await WorkerFrameSampler.create(worker, spec);
    await expect(sampler.sampleFrame(4)).resolves.toEqual(
      new Map([
        [
          'element',
          expect.objectContaining({
            translateX: 4,
          }),
        ],
      ]),
    );
    sampler.destroy();
    expect(worker.terminated).toBe(true);
    await expect(sampler.sampleFrame(1)).rejects.toThrow('disposed');
  });

  it.each([
    ['error', 'startup failed'],
    ['messageerror', 'unreadable startup message'],
    ['timeout', 'startup timed out'],
  ] as const)('rejects and terminates on worker %s during startup', async (failure, message) => {
    const worker = new FakeWorker(failure);
    await expect(WorkerFrameSampler.create(worker, spec, 5)).rejects.toThrow(message);
    expect(worker.terminated).toBe(true);
  });
});

import { describe, expect, it } from 'vitest';
import type {
  ExportWorkerLike,
  FrameSamplerWorkerRequest,
  FrameSamplerWorkerResponse,
} from './workerSampler.js';
import { WorkerFrameSampler } from './workerSampler.js';
import type { FrameSamplerSpec } from './sampler.js';

class FakeWorker implements ExportWorkerLike {
  terminated = false;
  private listeners = new Set<
    (event: MessageEvent<FrameSamplerWorkerResponse>) => void
  >();

  postMessage(message: FrameSamplerWorkerRequest): void {
    if (message.type === 'init') {
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

  addEventListener(
    _type: 'message',
    listener: (event: MessageEvent<FrameSamplerWorkerResponse>) => void,
  ): void {
    this.listeners.add(listener);
  }

  removeEventListener(
    _type: 'message',
    listener: (event: MessageEvent<FrameSamplerWorkerResponse>) => void,
  ): void {
    this.listeners.delete(listener);
  }

  terminate(): void {
    this.terminated = true;
  }

  private emit(response: FrameSamplerWorkerResponse): void {
    const event = { data: response } as MessageEvent<FrameSamplerWorkerResponse>;
    for (const listener of this.listeners) listener(event);
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
});

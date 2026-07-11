import {
  createFrameSampler,
  serializeFrameState,
} from '@excalimate/export-runtime';
import type {
  ExportFrameSampler,
  FrameSamplerWorkerRequest,
  FrameSamplerWorkerResponse,
} from '@excalimate/export-runtime';

interface WorkerScope {
  addEventListener(
    type: 'message',
    listener: (event: MessageEvent<FrameSamplerWorkerRequest>) => void,
  ): void;
  postMessage(message: FrameSamplerWorkerResponse): void;
  close(): void;
}

const scope = globalThis as unknown as WorkerScope;
let sampler: ExportFrameSampler | null = null;
const cancelled = new Set<number>();

scope.addEventListener(
  'message',
  (event: MessageEvent<FrameSamplerWorkerRequest>): void => {
    const request = event.data;
    if (request.type === 'dispose') {
      sampler = null;
      cancelled.clear();
      scope.close();
      return;
    }
    if (request.type === 'cancel') {
      cancelled.add(request.requestId);
      return;
    }
    try {
      if (request.type === 'init') {
        sampler = createFrameSampler(request.spec);
        scope.postMessage({
          type: 'ready',
          requestId: request.requestId,
          frameCount: sampler.frameCount,
          sampleCount: sampler.sampleCount,
        });
        return;
      }
      if (cancelled.delete(request.requestId)) {
        scope.postMessage({
          type: 'cancelled',
          requestId: request.requestId,
        });
        return;
      }
      if (!sampler) throw new Error('Frame sampler worker is not initialized');
      scope.postMessage({
        type: 'frame',
        requestId: request.requestId,
        frame: serializeFrameState(
          sampler.sampleFrame(request.frameIndex),
        ),
      });
    } catch (error) {
      scope.postMessage({
        type: 'error',
        requestId: request.requestId,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  },
);

import type {
  ElementAnimationState,
  FrameState,
} from '@excalimate/animation-core';
import {
  deserializeFrameState,
  type FrameSamplerSpec,
  type SerializedFrameState,
} from './sampler.js';
import { ExportCancelledError } from './controller.js';

export type FrameSamplerWorkerRequest =
  | { type: 'init'; requestId: number; spec: FrameSamplerSpec }
  | { type: 'sample'; requestId: number; frameIndex: number }
  | { type: 'cancel'; requestId: number }
  | { type: 'dispose' };

export type FrameSamplerWorkerResponse =
  | {
      type: 'ready';
      requestId: number;
      frameCount: number;
      sampleCount: number;
    }
  | {
      type: 'frame';
      requestId: number;
      frame: SerializedFrameState;
    }
  | { type: 'cancelled'; requestId: number }
  | { type: 'error'; requestId: number; message: string };

export interface ExportWorkerLike {
  postMessage(message: FrameSamplerWorkerRequest): void;
  addEventListener(
    type: 'message',
    listener: (event: MessageEvent<FrameSamplerWorkerResponse>) => void,
  ): void;
  removeEventListener(
    type: 'message',
    listener: (event: MessageEvent<FrameSamplerWorkerResponse>) => void,
  ): void;
  terminate(): void;
}

interface PendingRequest {
  resolve(value: FrameState | undefined): void;
  reject(error: Error): void;
  removeAbortListener?: () => void;
}

export class WorkerFrameSampler {
  readonly frameCount: number;
  readonly sampleCount: number;
  private readonly worker: ExportWorkerLike;
  private readonly pending = new Map<number, PendingRequest>();
  private nextRequestId = 1;
  private destroyed = false;

  private constructor(
    worker: ExportWorkerLike,
    frameCount: number,
    sampleCount: number,
  ) {
    this.worker = worker;
    this.frameCount = frameCount;
    this.sampleCount = sampleCount;
    this.worker.addEventListener('message', this.handleMessage);
  }

  static async create(
    worker: ExportWorkerLike,
    spec: FrameSamplerSpec,
  ): Promise<WorkerFrameSampler> {
    const requestId = 0;
    const ready = new Promise<Extract<FrameSamplerWorkerResponse, { type: 'ready' }>>(
      (resolve, reject) => {
        const listener = (
          event: MessageEvent<FrameSamplerWorkerResponse>,
        ): void => {
          if (event.data.requestId !== requestId) return;
          if (event.data.type === 'ready') {
            worker.removeEventListener('message', listener);
            resolve(event.data);
          } else if (event.data.type === 'error') {
            worker.removeEventListener('message', listener);
            reject(new Error(event.data.message));
          }
        };
        worker.addEventListener('message', listener);
      },
    );
    worker.postMessage({ type: 'init', requestId, spec });
    try {
      const response = await ready;
      return new WorkerFrameSampler(
        worker,
        response.frameCount,
        response.sampleCount,
      );
    } catch (error) {
      worker.terminate();
      throw error;
    }
  }

  sampleFrame(index: number, signal?: AbortSignal): Promise<FrameState> {
    if (this.destroyed) {
      return Promise.reject(new Error('Frame sampler worker is disposed'));
    }
    if (signal?.aborted) {
      return Promise.reject(new ExportCancelledError(abortReason(signal)));
    }
    const requestId = this.nextRequestId;
    this.nextRequestId += 1;
    return new Promise<FrameState>((resolve, reject) => {
      const pending: PendingRequest = {
        resolve(value): void {
          if (!value) {
            reject(new Error('Worker returned no frame'));
            return;
          }
          resolve(value);
        },
        reject,
      };
      if (signal) {
        const onAbort = (): void => {
          this.worker.postMessage({ type: 'cancel', requestId });
          this.pending.delete(requestId);
          reject(new ExportCancelledError(abortReason(signal)));
        };
        signal.addEventListener('abort', onAbort, { once: true });
        pending.removeAbortListener = () =>
          signal.removeEventListener('abort', onAbort);
      }
      this.pending.set(requestId, pending);
      this.worker.postMessage({ type: 'sample', requestId, frameIndex: index });
    });
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.worker.postMessage({ type: 'dispose' });
    this.worker.removeEventListener('message', this.handleMessage);
    this.worker.terminate();
    for (const pending of this.pending.values()) {
      pending.removeAbortListener?.();
      pending.reject(new ExportCancelledError('Frame sampler worker disposed'));
    }
    this.pending.clear();
  }

  private readonly handleMessage = (
    event: MessageEvent<FrameSamplerWorkerResponse>,
  ): void => {
    const response = event.data;
    const pending = this.pending.get(response.requestId);
    if (!pending) return;
    pending.removeAbortListener?.();
    this.pending.delete(response.requestId);
    if (response.type === 'frame') {
      pending.resolve(deserializeFrameState(response.frame));
    } else if (response.type === 'cancelled') {
      pending.reject(new ExportCancelledError());
    } else if (response.type === 'error') {
      pending.reject(new Error(response.message));
    }
  };
}

export function cloneElementAnimationState(
  state: ElementAnimationState,
): ElementAnimationState {
  return { ...state };
}

function abortReason(signal: AbortSignal): string {
  return typeof signal.reason === 'string' ? signal.reason : 'Export cancelled';
}

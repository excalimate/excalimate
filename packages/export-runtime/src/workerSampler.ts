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

export interface ExportWorkerEventMap {
  message: MessageEvent<FrameSamplerWorkerResponse>;
  messageerror: MessageEvent<unknown>;
  error: ErrorEvent;
}

export interface ExportWorkerLike {
  postMessage(message: FrameSamplerWorkerRequest): void;
  addEventListener<K extends keyof ExportWorkerEventMap>(
    type: K,
    listener: (event: ExportWorkerEventMap[K]) => void,
  ): void;
  removeEventListener<K extends keyof ExportWorkerEventMap>(
    type: K,
    listener: (event: ExportWorkerEventMap[K]) => void,
  ): void;
  terminate(): void;
}

interface PendingRequest {
  resolve(value: FrameState | undefined): void;
  reject(error: Error): void;
  removeAbortListener?: () => void;
}

const WORKER_STARTUP_TIMEOUT_MS = 10_000;

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
    this.worker.addEventListener('error', this.handleWorkerError);
    this.worker.addEventListener('messageerror', this.handleMessageError);
  }

  static async create(
    worker: ExportWorkerLike,
    spec: FrameSamplerSpec,
    startupTimeoutMs = WORKER_STARTUP_TIMEOUT_MS,
  ): Promise<WorkerFrameSampler> {
    const requestId = 0;
    let cleanupStartupListeners = (): void => {};
    const ready = new Promise<Extract<FrameSamplerWorkerResponse, { type: 'ready' }>>(
      (resolve, reject) => {
        const cleanup = (): void => {
          clearTimeout(timeoutId);
          worker.removeEventListener('message', handleMessage);
          worker.removeEventListener('error', handleError);
          worker.removeEventListener('messageerror', handleMessageError);
        };
        const handleMessage = (event: MessageEvent<FrameSamplerWorkerResponse>): void => {
          if (event.data.requestId !== requestId) return;
          if (event.data.type === 'ready') {
            cleanup();
            resolve(event.data);
          } else if (event.data.type === 'error') {
            cleanup();
            reject(new Error(event.data.message));
          }
        };
        const handleError = (event: ErrorEvent): void => {
          cleanup();
          reject(new Error(event.message || 'Frame sampler worker failed to start'));
        };
        const handleMessageError = (): void => {
          cleanup();
          reject(new Error('Frame sampler worker returned an unreadable startup message'));
        };
        cleanupStartupListeners = cleanup;
        worker.addEventListener('message', handleMessage);
        worker.addEventListener('error', handleError);
        worker.addEventListener('messageerror', handleMessageError);
        const timeoutId = setTimeout(() => {
          cleanup();
          reject(new Error('Frame sampler worker startup timed out'));
        }, startupTimeoutMs);
      },
    );
    try {
      worker.postMessage({ type: 'init', requestId, spec });
      const response = await ready;
      return new WorkerFrameSampler(
        worker,
        response.frameCount,
        response.sampleCount,
      );
    } catch (error) {
      cleanupStartupListeners();
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
    try {
      this.worker.postMessage({ type: 'dispose' });
    } finally {
      this.removeWorkerListeners();
      this.worker.terminate();
      this.rejectPending(new ExportCancelledError('Frame sampler worker disposed'));
    }
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

  private readonly handleWorkerError = (event: ErrorEvent): void => {
    this.failWorker(new Error(event.message || 'Frame sampler worker failed'));
  };

  private readonly handleMessageError = (): void => {
    this.failWorker(new Error('Frame sampler worker returned an unreadable message'));
  };

  private failWorker(error: Error): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.removeWorkerListeners();
    this.worker.terminate();
    this.rejectPending(error);
  }

  private removeWorkerListeners(): void {
    this.worker.removeEventListener('message', this.handleMessage);
    this.worker.removeEventListener('error', this.handleWorkerError);
    this.worker.removeEventListener('messageerror', this.handleMessageError);
  }

  private rejectPending(error: Error): void {
    for (const pending of this.pending.values()) {
      pending.removeAbortListener?.();
      pending.reject(error);
    }
    this.pending.clear();
  }
}

export function cloneElementAnimationState(
  state: ElementAnimationState,
): ElementAnimationState {
  return { ...state };
}

function abortReason(signal: AbortSignal): string {
  return typeof signal.reason === 'string' ? signal.reason : 'Export cancelled';
}

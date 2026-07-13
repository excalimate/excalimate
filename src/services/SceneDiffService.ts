import { diffSceneStates } from '@excalimate/animation-core';
import type { SceneDiffResult } from '@excalimate/animation-core';
import type { SceneElementMapping, SceneState } from '@excalimate/project-schema';

export const SCENE_DIFF_WORKER_THRESHOLD = 500;

interface SceneDiffWorkerRequest {
  requestId: string;
  fromState: SceneState;
  toState: SceneState;
  mappings: readonly SceneElementMapping[];
}

interface SceneDiffWorkerResponse {
  requestId: string;
  ok: boolean;
  result?: SceneDiffResult;
  error?: string;
}

export interface SceneDiffWorkerLike {
  postMessage: (message: SceneDiffWorkerRequest) => void;
  terminate: () => void;
  addEventListener: (type: 'message' | 'error', listener: EventListener) => void;
  removeEventListener: (type: 'message' | 'error', listener: EventListener) => void;
}

export interface AnalyzeSceneDiffOptions {
  mappings?: readonly SceneElementMapping[];
  signal?: AbortSignal;
  workerFactory?: () => SceneDiffWorkerLike;
}

export async function analyzeSceneDiff(
  fromState: SceneState,
  toState: SceneState,
  options: AnalyzeSceneDiffOptions = {},
): Promise<SceneDiffResult> {
  throwIfAborted(options.signal);
  const elementCount = Math.max(fromState.elements.length, toState.elements.length);
  if (elementCount < SCENE_DIFF_WORKER_THRESHOLD) {
    return diffSceneStates(fromState, toState, {
      mappings: options.mappings,
      shouldCancel: () => options.signal?.aborted === true,
    });
  }

  const worker =
    options.workerFactory?.() ??
    (new Worker(new URL('../workers/sceneDiff.worker.ts', import.meta.url), {
      type: 'module',
    }) as SceneDiffWorkerLike);
  const requestId = crypto.randomUUID();
  return new Promise<SceneDiffResult>((resolve, reject) => {
    const cleanup = () => {
      options.signal?.removeEventListener('abort', handleAbort);
      worker.removeEventListener('message', handleMessage);
      worker.removeEventListener('error', handleError);
      worker.terminate();
    };
    const handleAbort = () => {
      cleanup();
      reject(new DOMException('Scene diff was cancelled', 'AbortError'));
    };
    const handleError = () => {
      cleanup();
      reject(new Error('The local scene-diff worker failed'));
    };
    const handleMessage = (event: Event) => {
      const response = (event as MessageEvent<SceneDiffWorkerResponse>).data;
      if (response.requestId !== requestId) return;
      cleanup();
      if (response.ok && response.result) {
        resolve(response.result);
      } else {
        reject(new Error(response.error ?? 'Scene diff failed'));
      }
    };
    options.signal?.addEventListener('abort', handleAbort, { once: true });
    worker.addEventListener('message', handleMessage);
    worker.addEventListener('error', handleError);
    worker.postMessage({
      requestId,
      fromState,
      toState,
      mappings: options.mappings ?? [],
    });
  });
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new DOMException('Scene diff was cancelled', 'AbortError');
  }
}

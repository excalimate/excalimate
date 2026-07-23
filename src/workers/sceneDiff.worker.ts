/// <reference lib="webworker" />

import { diffSceneStates } from '@excalimate/animation-core';
import type { SceneElementMapping, SceneState } from '@excalimate/project-schema';

interface SceneDiffWorkerRequest {
  requestId: string;
  fromState: SceneState;
  toState: SceneState;
  mappings: readonly SceneElementMapping[];
}

self.addEventListener('message', (event: MessageEvent<SceneDiffWorkerRequest>) => {
  const { requestId, fromState, toState, mappings } = event.data;
  try {
    self.postMessage({
      requestId,
      ok: true,
      result: diffSceneStates(fromState, toState, { mappings }),
    });
  } catch (error) {
    self.postMessage({
      requestId,
      ok: false,
      error: error instanceof Error ? error.message : 'Scene diff failed',
    });
  }
});

export {};

/// <reference lib="webworker" />

import {
  analyzeAutoAnimate,
  type AutoAnimateAnalysis,
  type AutoAnimateRequest,
} from '@excalimate/animation-core';

export interface AutoAnimateWorkerMessage {
  requestId: number;
  request: AutoAnimateRequest;
}

export type AutoAnimateWorkerResponse =
  | {
      requestId: number;
      ok: true;
      analysis: AutoAnimateAnalysis;
    }
  | {
      requestId: number;
      ok: false;
      error: string;
    };

self.addEventListener(
  'message',
  (event: MessageEvent<AutoAnimateWorkerMessage>) => {
    try {
      const analysis = analyzeAutoAnimate(event.data.request);
      self.postMessage({
        requestId: event.data.requestId,
        ok: true,
        analysis,
      } satisfies AutoAnimateWorkerResponse);
    } catch (error) {
      self.postMessage({
        requestId: event.data.requestId,
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : 'Local arrangement analysis failed',
      } satisfies AutoAnimateWorkerResponse);
    }
  },
);

export {};

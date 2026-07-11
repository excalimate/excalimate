import {
  analyzeAutoAnimate,
  type AutoAnimateAnalysis,
  type AutoAnimateElement,
  type AutoAnimateScope,
} from '@excalimate/animation-core';
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types';
import type {
  AutoAnimateWorkerMessage,
  AutoAnimateWorkerResponse,
} from '../workers/autoAnimate.worker';

let requestId = 0;

export function toAutoAnimateElements(
  elements: readonly ExcalidrawElement[],
): AutoAnimateElement[] {
  return elements.map((element, zIndex) => {
    const semantic = element as ExcalidrawElement & {
      groupIds?: readonly string[];
      containerId?: string | null;
      boundElements?: readonly { id: string; type: string }[];
      startBinding?: { elementId: string } | null;
      endBinding?: { elementId: string } | null;
    };
    return {
      id: element.id,
      type: element.type,
      x: element.x,
      y: element.y,
      width: element.width,
      height: element.height,
      zIndex,
      isDeleted: element.isDeleted,
      ...(semantic.groupIds ? { groupIds: semantic.groupIds } : {}),
      ...(semantic.containerId !== undefined
        ? { containerId: semantic.containerId }
        : {}),
      ...(semantic.boundElements
        ? { boundElements: semantic.boundElements }
        : {}),
      ...(semantic.startBinding
        ? { startBinding: { elementId: semantic.startBinding.elementId } }
        : {}),
      ...(semantic.endBinding
        ? { endBinding: { elementId: semantic.endBinding.elementId } }
        : {}),
    };
  });
}

export async function analyzeAutoAnimateInWorker(input: {
  elements: readonly ExcalidrawElement[];
  scope: AutoAnimateScope;
  selectedElementIds?: readonly string[];
}): Promise<AutoAnimateAnalysis> {
  const request = {
    elements: toAutoAnimateElements(input.elements),
    scope: input.scope,
    ...(input.selectedElementIds
      ? { selectedElementIds: input.selectedElementIds }
      : {}),
  };

  if (typeof Worker === 'undefined') {
    return analyzeAutoAnimate(request);
  }

  const currentRequestId = ++requestId;
  const worker = new Worker(
    new URL('../workers/autoAnimate.worker.ts', import.meta.url),
    { type: 'module', name: 'excalimate-auto-animate' },
  );
  return new Promise<AutoAnimateAnalysis>((resolve, reject) => {
    worker.addEventListener(
      'message',
      (event: MessageEvent<AutoAnimateWorkerResponse>) => {
        if (event.data.requestId !== currentRequestId) return;
        worker.terminate();
        if (event.data.ok) {
          resolve(event.data.analysis);
        } else {
          reject(new Error(event.data.error));
        }
      },
    );
    worker.addEventListener('error', (event) => {
      worker.terminate();
      reject(new Error(event.message || 'Local arrangement worker failed'));
    });
    worker.postMessage({
      requestId: currentRequestId,
      request,
    } satisfies AutoAnimateWorkerMessage);
  });
}

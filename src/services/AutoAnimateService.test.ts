import { describe, expect, it } from 'vitest';
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types';
import {
  AUTO_ANIMATE_CHAIN_ARROW_IDS,
  AUTO_ANIMATE_CHAIN_NODE_IDS,
  createBoundArrowChainScene,
} from '../test-fixtures/autoAnimateChain';
import { toAutoAnimateElements } from './AutoAnimateService';

describe('AutoAnimateService', () => {
  it('sends only geometry and relationship fields to the local worker', () => {
    const element = {
      id: 'shape',
      type: 'rectangle',
      x: 0,
      y: 0,
      width: 100,
      height: 60,
      angle: 0,
      text: 'private diagram text',
      link: 'https://private.example',
      boundElements: [{ id: 'label', type: 'text' }],
      isDeleted: false,
    } as unknown as ExcalidrawElement;

    expect(toAutoAnimateElements([element])).toEqual([
      {
        id: 'shape',
        type: 'rectangle',
        x: 0,
        y: 0,
        width: 100,
        height: 60,
        zIndex: 0,
        isDeleted: false,
        boundElements: [{ id: 'label', type: 'text' }],
      },
    ]);
  });

  it('preserves bound shape, label, and arrow relationships for the chain fixture', () => {
    const projected = toAutoAnimateElements(createBoundArrowChainScene().elements);

    expect(projected).toHaveLength(11);
    for (const [index, arrowId] of AUTO_ANIMATE_CHAIN_ARROW_IDS.entries()) {
      expect(projected.find((element) => element.id === arrowId)).toMatchObject({
        type: 'arrow',
        startBinding: { elementId: AUTO_ANIMATE_CHAIN_NODE_IDS[index] },
        endBinding: { elementId: AUTO_ANIMATE_CHAIN_NODE_IDS[index + 1] },
      });
    }
    for (const nodeId of AUTO_ANIMATE_CHAIN_NODE_IDS) {
      expect(projected.find((element) => element.id === `${nodeId}-label`)).toMatchObject({
        type: 'text',
        containerId: nodeId,
      });
    }
  });
});

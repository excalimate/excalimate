import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types';
import type { ExcalidrawSceneData } from '../types/excalidraw';

const NODE_WIDTH = 140;
const NODE_HEIGHT = 80;
const NODE_GAP = 80;

export const AUTO_ANIMATE_CHAIN_NODE_IDS = ['question', 'concept', 'example', 'recap'] as const;

export const AUTO_ANIMATE_CHAIN_ARROW_IDS = [
  'question-concept',
  'concept-example',
  'example-recap',
] as const;

function baseElement(
  id: string,
  type: string,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  return {
    id,
    type,
    x,
    y,
    width,
    height,
    angle: 0,
    opacity: 100,
    isDeleted: false,
    groupIds: [],
    frameId: null,
    boundElements: null,
    link: null,
    locked: false,
  };
}

export function createBoundArrowChainScene(): ExcalidrawSceneData {
  const elements: ExcalidrawElement[] = [];
  const labels = ['Question', 'Concept', 'Example', 'Recap'];

  AUTO_ANIMATE_CHAIN_NODE_IDS.forEach((id, index) => {
    const x = index * (NODE_WIDTH + NODE_GAP);
    const labelId = `${id}-label`;
    const boundElements: { id: string; type: 'text' | 'arrow' }[] = [{ id: labelId, type: 'text' }];
    if (index > 0) {
      boundElements.push({
        id: AUTO_ANIMATE_CHAIN_ARROW_IDS[index - 1]!,
        type: 'arrow',
      });
    }
    if (index < AUTO_ANIMATE_CHAIN_ARROW_IDS.length) {
      boundElements.push({
        id: AUTO_ANIMATE_CHAIN_ARROW_IDS[index]!,
        type: 'arrow',
      });
    }
    elements.push({
      ...baseElement(id, 'rectangle', x, 0, NODE_WIDTH, NODE_HEIGHT),
      boundElements,
    } as unknown as ExcalidrawElement);
    elements.push({
      ...baseElement(labelId, 'text', x + 25, 28, 90, 24),
      text: labels[index],
      originalText: labels[index],
      containerId: id,
      boundElements: null,
    } as unknown as ExcalidrawElement);
  });

  AUTO_ANIMATE_CHAIN_ARROW_IDS.forEach((id, index) => {
    const sourceId = AUTO_ANIMATE_CHAIN_NODE_IDS[index]!;
    const destinationId = AUTO_ANIMATE_CHAIN_NODE_IDS[index + 1]!;
    elements.push({
      ...baseElement(
        id,
        'arrow',
        index * (NODE_WIDTH + NODE_GAP) + NODE_WIDTH,
        NODE_HEIGHT / 2,
        NODE_GAP,
        0,
      ),
      points: [
        [0, 0],
        [NODE_GAP, 0],
      ],
      startBinding: {
        elementId: sourceId,
        focus: 0,
        gap: 0,
        fixedPoint: [1, 0.5],
      },
      endBinding: {
        elementId: destinationId,
        focus: 0,
        gap: 0,
        fixedPoint: [0, 0.5],
      },
      startArrowhead: null,
      endArrowhead: 'arrow',
      boundElements: null,
    } as unknown as ExcalidrawElement);
  });

  return {
    elements,
    appState: { viewBackgroundColor: '#ffffff' },
    files: {},
  };
}

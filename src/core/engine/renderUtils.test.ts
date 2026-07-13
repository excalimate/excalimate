import type {
  ExcalidrawArrowElement,
  ExcalidrawElement,
} from '@excalidraw/excalidraw/element/types';
import { describe, expect, it } from 'vitest';
import type { FrameState } from '../../types/animation';
import {
  applyAnimationToElements,
  getRenderableAnimationElements,
  mergeNormalizedElementsIntoSource,
} from './renderUtils';

function element(overrides: Partial<ExcalidrawElement> = {}): ExcalidrawElement {
  return {
    id: 'node',
    type: 'rectangle',
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    angle: 0,
    opacity: 100,
    isDeleted: false,
    ...overrides,
  } as ExcalidrawArrowElement;
}

function frame(drawProgress: number): FrameState {
  return new Map([
    [
      'node',
      {
        targetId: 'node',
        opacity: 1,
        translateX: 0,
        translateY: 0,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
        drawProgress,
      },
    ],
  ]);
}

describe('Smart Transition rendering', () => {
  it('revives only opacity-animated tombstones without mutating the scene element', () => {
    const tombstone = element({ isDeleted: true });

    expect(getRenderableAnimationElements([tombstone], new Set())).toEqual([]);
    const [renderable] = getRenderableAnimationElements([tombstone], new Set(['node']));

    expect(renderable?.isDeleted).toBe(false);
    expect(tombstone.isDeleted).toBe(true);
  });

  it('renders opacity tracks absolutely when the live baseline is fully transparent', () => {
    const transparent = element({ opacity: 0 });
    const renderable = getRenderableAnimationElements([transparent], new Set(['node']));
    const frameState: FrameState = new Map([
      [
        'node',
        {
          targetId: 'node',
          opacity: 0.6,
          translateX: 0,
          translateY: 0,
          scaleX: 1,
          scaleY: 1,
          rotation: 0,
          drawProgress: 1,
        },
      ],
    ]);

    const [animated] = applyAnimationToElements(renderable, frameState, [], new Set(['node']));

    expect(animated?.opacity).toBe(60);
    expect(transparent.opacity).toBe(0);
  });

  it('preserves a tombstone baseline opacity while fading it out', () => {
    const tombstone = element({ isDeleted: true, opacity: 50 });
    const renderable = getRenderableAnimationElements([tombstone], new Set(['node']));
    const frameState: FrameState = new Map([
      [
        'node',
        {
          targetId: 'node',
          opacity: 0.5,
          translateX: 0,
          translateY: 0,
          scaleX: 1,
          scaleY: 1,
          rotation: 0,
          drawProgress: 1,
        },
      ],
    ]);

    const [animated] = applyAnimationToElements(renderable, frameState, []);

    expect(animated?.opacity).toBe(25);
    expect(tombstone.opacity).toBe(50);
    expect(tombstone.isDeleted).toBe(true);
  });

  it('keeps straight and reversed two-point arrows structurally intact while drawing', () => {
    const straight = {
      ...element({ type: 'arrow', width: 100, height: 0 }),
      points: [
        [0, 0],
        [100, 0],
      ],
      startArrowhead: 'dot',
      endArrowhead: 'arrow',
      startBinding: null,
      endBinding: null,
    } as ExcalidrawArrowElement;
    const reversed = {
      ...straight,
      points: [
        [0, 0],
        [-100, 0],
      ],
    } as ExcalidrawElement;

    const [animatedStraight, animatedReversed] = applyAnimationToElements(
      [straight, reversed],
      frame(0.5),
      [],
    );

    expect('points' in animatedStraight! ? animatedStraight.points : null).toEqual([
      [0, 0],
      [50, 0],
    ]);
    expect('points' in animatedReversed! ? animatedReversed.points : null).toEqual([
      [0, 0],
      [-50, 0],
    ]);
  });

  it('preserves elbow point cardinality and endpoint metadata at partial progress', () => {
    const arrow = {
      ...element({ type: 'arrow', width: 100, height: 50 }),
      points: [
        [0, 0],
        [50, 0],
        [50, 50],
        [100, 50],
      ],
      elbowed: true,
      fixedSegments: [{ index: 2, start: [50, 0], end: [50, 50] }],
      startArrowhead: 'dot',
      endArrowhead: 'triangle',
      startBinding: {
        elementId: 'start',
        focus: 0,
        gap: 8,
        fixedPoint: [1, 0.5],
      },
      endBinding: {
        elementId: 'end',
        focus: 0,
        gap: 8,
        fixedPoint: [0, 0.5],
      },
      groupIds: ['flow'],
      boundElements: [{ id: 'arrow-label', type: 'text' }],
    } as unknown as ExcalidrawArrowElement;
    const source = structuredClone(arrow);

    const [animated] = applyAnimationToElements([arrow], frame(0.5), []);

    expect('points' in animated! ? animated.points : null).toEqual([
      [0, 0],
      [50, 0],
      [50, 25],
      [50, 25],
    ]);
    expect(animated).toMatchObject({
      elbowed: true,
      fixedSegments: [{ index: 2, start: [50, 0], end: [50, 50] }],
      startArrowhead: 'dot',
      endArrowhead: 'triangle',
      startBinding: source.startBinding,
      endBinding: source.endBinding,
      groupIds: ['flow'],
      boundElements: [{ id: 'arrow-label', type: 'text' }],
    });
    expect(arrow).toEqual(source);
  });

  it('hides zero-progress arrowheads and restores exact full geometry', () => {
    const arrow = {
      ...element({ type: 'arrow', width: 100, height: 20, opacity: 80 }),
      points: [
        [0, 0],
        [40, 20],
        [100, 0],
      ],
      startArrowhead: 'bar',
      endArrowhead: 'arrow',
      startBinding: { elementId: 'start', focus: 0, gap: 6 },
      endBinding: { elementId: 'end', focus: 0, gap: 6 },
    } as unknown as ExcalidrawArrowElement;
    const source = structuredClone(arrow);

    const [hidden] = applyAnimationToElements([arrow], frame(0), []);
    const [complete] = applyAnimationToElements([arrow], frame(1), []);

    expect(hidden?.opacity).toBe(0);
    expect('points' in hidden! ? hidden.points : null).toEqual([
      [0, 0],
      [0, 0],
      [0, 0],
    ]);
    expect(complete).toMatchObject({
      opacity: 80,
      points: source.points,
      startArrowhead: source.startArrowhead,
      endArrowhead: source.endArrowhead,
      startBinding: source.startBinding,
      endBinding: source.endBinding,
    });
    expect(arrow).toEqual(source);
  });

  it('never persists transient preview geometry during Excalidraw normalization', () => {
    const source = {
      ...element({ type: 'arrow', width: 100, height: 0 }),
      points: [
        [0, 0],
        [100, 0],
      ],
      startArrowhead: null,
      endArrowhead: 'arrow',
      startBinding: { elementId: 'start', focus: 0, gap: 8 },
      endBinding: { elementId: 'end', focus: 0, gap: 8 },
    } as unknown as ExcalidrawArrowElement;
    const normalized = {
      ...source,
      index: 'a0',
      opacity: 0,
      points: [
        [0, 0],
        [0, 0],
      ],
    } as unknown as ExcalidrawArrowElement;

    const [merged] = mergeNormalizedElementsIntoSource([source], [normalized]);

    expect(merged).toMatchObject({
      index: 'a0',
      opacity: 100,
      points: [
        [0, 0],
        [100, 0],
      ],
      startBinding: source.startBinding,
      endBinding: source.endBinding,
      endArrowhead: 'arrow',
    });
    expect(source).not.toHaveProperty('index');
  });
});

import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types';
import { describe, expect, it } from 'vitest';
import type { FrameState } from '../../types/animation';
import { applyAnimationToElements, getRenderableAnimationElements } from './renderUtils';

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
  } as ExcalidrawElement;
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

  it('renders path-only draw progress in the editor element snapshot', () => {
    const line = {
      ...element({ type: 'line', width: 100, height: 0 }),
      points: [
        [0, 0],
        [50, 0],
        [100, 0],
      ],
    } as ExcalidrawElement;
    const frameState: FrameState = new Map([
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
          drawProgress: 0.5,
        },
      ],
    ]);

    const [animated] = applyAnimationToElements([line], frameState, []);

    expect('points' in animated! ? animated.points : null).toEqual([
      [0, 0],
      [50, 0],
      [50, 0],
    ]);
  });
});

import { describe, expect, it, vi } from 'vitest';
import {
  analyzeAutoAnimate,
  normalizeSemanticTargets,
  type AutoAnimateElement,
} from './autoAnimate';

function node(
  id: string,
  x: number,
  y: number,
  zIndex: number,
): AutoAnimateElement {
  return { id, type: 'rectangle', x, y, width: 100, height: 60, zIndex };
}

function arrow(
  id: string,
  sourceId: string,
  destinationId: string,
  zIndex: number,
): AutoAnimateElement {
  return {
    id,
    type: 'arrow',
    x: 0,
    y: 0,
    width: 100,
    height: 10,
    zIndex,
    startBinding: { elementId: sourceId },
    endBinding: { elementId: destinationId },
  };
}

describe('auto animate analysis', () => {
  it('selects a clear left-to-right chain and reveals nodes before outbound arrows', () => {
    const elements = [
      node('a', 0, 0, 0),
      node('b', 200, 0, 1),
      node('c', 400, 0, 2),
      node('d', 600, 0, 3),
      arrow('ab', 'a', 'b', 4),
      arrow('bc', 'b', 'c', 5),
      arrow('cd', 'c', 'd', 6),
    ];

    const first = analyzeAutoAnimate({ elements, scope: 'diagram' });
    const second = analyzeAutoAnimate({
      elements: [...elements].reverse(),
      scope: 'diagram',
    });

    expect(first).toEqual(second);
    expect(first).toMatchObject({
      strategy: 'linear-left-to-right',
      confidenceBand: 'high',
      ambiguous: false,
    });
    expect(first.orderedTargetIds.slice(0, 4)).toEqual(['a', 'b', 'c', 'd']);
    expect(first.recipes.map((recipe) => recipe.targetIds[0])).toEqual([
      'a',
      'ab',
      'b',
      'bc',
      'c',
      'cd',
      'd',
    ]);
  });

  it('keeps branching DAGs hierarchical and weak spatial chains conservative', () => {
    const dag = analyzeAutoAnimate({
      elements: [
        node('a', 0, 100, 0),
        node('b', 200, 0, 1),
        node('c', 200, 200, 2),
        node('d', 400, 100, 3),
        arrow('ab', 'a', 'b', 4),
        arrow('ac', 'a', 'c', 5),
        arrow('bd', 'b', 'd', 6),
        arrow('cd', 'c', 'd', 7),
      ],
      scope: 'diagram',
    });
    const weakAlignment = analyzeAutoAnimate({
      elements: [
        node('a', 0, 0, 0),
        node('b', 200, 180, 1),
        node('c', 400, 20, 2),
        arrow('ab', 'a', 'b', 3),
        arrow('bc', 'b', 'c', 4),
      ],
      scope: 'diagram',
    });

    expect(dag.strategy).toBe('hierarchical');
    expect(weakAlignment.strategy).not.toBe('linear-left-to-right');
  });

  it('groups bound labels and Excalidraw groups into semantic targets', () => {
    const elements = [
      {
        ...node('shape', 0, 0, 0),
        boundElements: [{ id: 'label', type: 'text' }],
      },
      {
        id: 'label',
        type: 'text',
        x: 10,
        y: 10,
        width: 50,
        height: 20,
        zIndex: 1,
        containerId: 'shape',
      },
      { ...node('group-a', 200, 0, 2), groupIds: ['group-1'] },
      { ...node('group-b', 220, 80, 3), groupIds: ['group-1'] },
    ];
    const targets = normalizeSemanticTargets(elements);
    const analysis = analyzeAutoAnimate({ elements, scope: 'diagram' });

    expect(targets).toEqual([
      expect.objectContaining({
        id: 'shape',
        elementIds: ['label', 'shape'],
      }),
      expect.objectContaining({
        id: 'group-1',
        elementIds: ['group-a', 'group-b'],
      }),
    ]);
    expect(analysis.recipes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          targetIds: ['label', 'shape'],
          staggerMs: 0,
        }),
        expect.objectContaining({
          targetIds: ['group-1'],
          staggerMs: 0,
        }),
      ]),
    );
  });

  it('does not claim hierarchy for cycles and reports ambiguity for sparse input', () => {
    const cycle = analyzeAutoAnimate({
      elements: [
        node('a', 0, 0, 0),
        node('b', 100, 100, 1),
        node('c', 0, 200, 2),
        arrow('ab', 'a', 'b', 3),
        arrow('bc', 'b', 'c', 4),
        arrow('ca', 'c', 'a', 5),
      ],
      scope: 'diagram',
    });
    const sparse = analyzeAutoAnimate({
      elements: [node('only', 0, 0, 0)],
      scope: 'diagram',
    });

    expect(cycle.strategy).not.toBe('hierarchical');
    expect(cycle.reasons.some((reason) => reason.code === 'cycle-fallback')).toBe(
      true,
    );
    expect(sparse).toMatchObject({
      strategy: 'stable-z-order',
      confidenceBand: 'low',
      ambiguous: true,
    });
  });

  it('limits selected analysis to selected semantic groups', () => {
    const analysis = analyzeAutoAnimate({
      elements: [node('a', 0, 0, 0), node('b', 200, 0, 1)],
      scope: 'selection',
      selectedElementIds: ['b'],
    });

    expect(analysis.semanticTargets.map((target) => target.id)).toEqual(['b']);
    expect(analysis.reasons[0]?.code).toBe('selection-scope');
  });

  it('performs no network calls', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    analyzeAutoAnimate({
      elements: [node('a', 0, 0, 0), node('b', 200, 0, 1)],
      scope: 'diagram',
    });
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});

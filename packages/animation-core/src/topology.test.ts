import { describe, expect, it } from 'vitest';
import { analyzeAnimationTopology } from './topology.js';

describe('deterministic topology analysis', () => {
  it('selects draw for path-only scopes', () => {
    const analysis = analyzeAnimationTopology(
      [
        { id: 'line-2', type: 'line', x: 20, y: 10 },
        { id: 'arrow-1', type: 'arrow', x: 0, y: 0 },
      ],
      'balanced',
    );

    expect(analysis).toMatchObject({
      strategy: 'draw',
      confidence: 0.94,
      orderedTargetIds: ['arrow-1', 'line-2'],
    });
    expect(analysis.draft.type).toBe('draw');
  });

  it('orders multi-element scopes by topology rather than input order', () => {
    const analysis = analyzeAnimationTopology(
      [
        { id: 'bottom', type: 'rectangle', x: 0, y: 200 },
        { id: 'top-right', type: 'text', x: 100, y: 0 },
        { id: 'top-left', type: 'rectangle', x: 0, y: 0 },
      ],
      'subtle',
    );

    expect(analysis.strategy).toBe('sequence');
    expect(analysis.orderedTargetIds).toEqual([
      'top-left',
      'top-right',
      'bottom',
    ]);
    expect(analysis.draft.timing).toMatchObject({
      durationMs: 700,
      staggerMs: 180,
    });
  });

  it('uses an energetic pop for a single element', () => {
    const first = analyzeAnimationTopology(
      [{ id: 'hero', type: 'rectangle', x: 10, y: 20 }],
      'energetic',
    );
    const second = analyzeAnimationTopology(
      [{ id: 'hero', type: 'rectangle', x: 10, y: 20 }],
      'energetic',
    );

    expect(first).toEqual(second);
    expect(first.strategy).toBe('pop');
  });
});

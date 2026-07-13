import { describe, expect, it } from 'vitest';
import type { AnimatableTarget } from '../../../types/excalidraw';
import { buildGroupLayers } from './groupHierarchy';

function group(
  id: string,
  centerX: number,
  centerY: number,
  parentGroupId?: string,
): AnimatableTarget {
  return {
    id,
    type: 'group',
    label: id,
    elementIds: [],
    originalBounds: {
      x: centerX - 10,
      y: centerY - 10,
      width: 20,
      height: 20,
      centerX,
      centerY,
    },
    originalAngle: 0,
    zIndex: 0,
    ...(parentGroupId ? { parentGroupId } : {}),
  };
}

describe('Lottie group coordinate composition', () => {
  it('maps root groups to composition space and nested groups relative to parents', () => {
    const targets: AnimatableTarget[] = [
      group('outer', 100, 100),
      group('inner', 150, 140, 'outer'),
      {
        id: 'element',
        type: 'element',
        label: 'Element',
        elementIds: ['element'],
        originalBounds: {
          x: 160,
          y: 150,
          width: 20,
          height: 20,
          centerX: 170,
          centerY: 160,
        },
        originalAngle: 0,
        zIndex: 1,
        parentGroupId: 'inner',
      },
    ];
    const result = buildGroupLayers(
      targets,
      [],
      { scaleX: 2, scaleY: 2, left: 10, top: 20 },
      30,
      0,
      1000,
      0,
      30,
      10,
    );
    const outer = result.groupLayers.find((layer) => layer.nm === 'outer');
    const inner = result.groupLayers.find((layer) => layer.nm === 'inner');
    expect(outer?.ks.p.k).toEqual([180, 160, 0]);
    expect(inner?.ks.p.k).toEqual([100, 80, 0]);
    expect(inner?.parent).toBe(outer?.ind);
    expect(result.parentOffsetMap.get('element')).toEqual({
      x: 280,
      y: 240,
    });
  });
});

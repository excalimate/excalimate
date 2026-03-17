import type { GroupHierarchy } from '../engine/AnimationEngine';
import type { AnimatableTarget } from '../../types/excalidraw';

export function buildGroupHierarchy(targets: AnimatableTarget[]): GroupHierarchy {
  const hierarchy: GroupHierarchy = {};
  for (const target of targets) {
    if (target.type === 'group') {
      hierarchy[target.id] = target.elementIds;
    }
  }
  return hierarchy;
}

import type { GroupHierarchy } from '../engine/AnimationEngine';
import type { AnimatableTarget } from '../../types/excalidraw';

export function buildGroupHierarchy(targets: AnimatableTarget[]): GroupHierarchy {
  const hierarchy: GroupHierarchy = {};
  for (const target of targets) {
    if (target.type === 'group') {
      const directChildren = targets
        .filter((candidate) => candidate.parentGroupId === target.id)
        .map((candidate) => candidate.id);
      hierarchy[target.id] =
        directChildren.length > 0 ? directChildren : target.elementIds;
    }
  }
  return hierarchy;
}

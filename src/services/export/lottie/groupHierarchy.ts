/**
 * Convert Excalimate group hierarchy to Lottie null layer parenting.
 */
import type { LottieNullLayer } from './types';
import type { AnimatableTarget } from '../../../types/excalidraw';
import type { AnimationTrack } from '../../../types/animation';
import { groupTracksByProperty, buildTransform } from './keyframeConverter';

/**
 * Build null layers for groups and return a parent index map.
 * Lottie uses `parent` property (layer index) for transform cascading.
 */
export function buildGroupLayers(
  targets: AnimatableTarget[],
  tracks: AnimationTrack[],
  fps: number,
  clipStart: number,
  ip: number,
  op: number,
  startIndex: number,
): { groupLayers: LottieNullLayer[]; parentMap: Map<string, number> } {
  const groupLayers: LottieNullLayer[] = [];
  /** Maps group ID → Lottie layer index */
  const groupIndexMap = new Map<string, number>();
  /** Maps element/group ID → parent layer index */
  const parentMap = new Map<string, number>();

  let layerIdx = startIndex;

  // Create null layers for each group target
  const groupTargets = targets.filter(t => t.type === 'group');

  for (const group of groupTargets) {
    const props = groupTracksByProperty(tracks, group.id);
    const cx = group.originalBounds.centerX;
    const cy = group.originalBounds.centerY;

    const transform = buildTransform(cx, cy, 0, 100, props, fps, clipStart);

    const nullLayer: LottieNullLayer = {
      ty: 3,
      nm: group.label ?? group.id,
      ind: layerIdx,
      ip,
      op,
      st: 0,
      ks: transform,
    };

    groupLayers.push(nullLayer);
    groupIndexMap.set(group.id, layerIdx);
    layerIdx++;
  }

  // Wire parent references
  for (const target of targets) {
    if (target.parentGroupId && groupIndexMap.has(target.parentGroupId)) {
      parentMap.set(target.id, groupIndexMap.get(target.parentGroupId)!);
    }
  }

  // Also wire group→parent group
  for (const group of groupTargets) {
    if (group.parentGroupId && groupIndexMap.has(group.parentGroupId)) {
      const nullLayer = groupLayers.find(l => l.ind === groupIndexMap.get(group.id));
      if (nullLayer) nullLayer.parent = groupIndexMap.get(group.parentGroupId);
    }
  }

  return { groupLayers, parentMap };
}

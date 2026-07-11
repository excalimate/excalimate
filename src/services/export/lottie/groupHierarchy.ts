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
  sceneToComp: Readonly<{
    scaleX: number;
    scaleY: number;
    left: number;
    top: number;
  }>,
  fps: number,
  clipStart: number,
  clipEnd: number,
  ip: number,
  op: number,
  startIndex: number,
): {
  groupLayers: LottieNullLayer[];
  parentMap: Map<string, number>;
  parentOffsetMap: Map<string, { x: number; y: number }>;
} {
  const groupLayers: LottieNullLayer[] = [];
  /** Maps group ID → Lottie layer index */
  const groupIndexMap = new Map<string, number>();
  /** Maps element/group ID → parent layer index */
  const parentMap = new Map<string, number>();
  const parentOffsetMap = new Map<string, { x: number; y: number }>();

  let layerIdx = startIndex;

  // Create null layers for each group target
  const groupTargets = targets.filter(t => t.type === 'group');
  const groupCenters = new Map(
    groupTargets.map((group) => [
      group.id,
      {
        x: (group.originalBounds.centerX - sceneToComp.left) * sceneToComp.scaleX,
        y: (group.originalBounds.centerY - sceneToComp.top) * sceneToComp.scaleY,
      },
    ]),
  );

  for (const group of groupTargets) {
    const props = groupTracksByProperty(tracks, group.id);
    const scaledProps = {
      ...props,
      translateX: props.translateX.map((keyframe) => ({
        ...keyframe,
        value: keyframe.value * sceneToComp.scaleX,
      })),
      translateY: props.translateY.map((keyframe) => ({
        ...keyframe,
        value: keyframe.value * sceneToComp.scaleY,
      })),
    };
    const center = groupCenters.get(group.id) ?? { x: 0, y: 0 };
    const parentCenter = group.parentGroupId
      ? groupCenters.get(group.parentGroupId)
      : undefined;
    const cx = center.x - (parentCenter?.x ?? 0);
    const cy = center.y - (parentCenter?.y ?? 0);

    const transform = buildTransform(cx, cy, 0, 100, scaledProps, fps, clipStart, clipEnd);

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
      const parentCenter = groupCenters.get(target.parentGroupId);
      if (parentCenter) parentOffsetMap.set(target.id, parentCenter);
    }
  }

  // Also wire group→parent group
  for (const group of groupTargets) {
    if (group.parentGroupId && groupIndexMap.has(group.parentGroupId)) {
      const nullLayer = groupLayers.find(l => l.ind === groupIndexMap.get(group.id));
      if (nullLayer) nullLayer.parent = groupIndexMap.get(group.parentGroupId);
    }
  }

  return { groupLayers, parentMap, parentOffsetMap };
}

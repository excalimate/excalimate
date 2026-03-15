import type { ReactNode } from 'react';
import { createElement } from 'react';
import {
  IconEye, IconArrowsHorizontal, IconArrowsVertical,
  IconArrowsMaximize, IconArrowsMinimize, IconRotate, IconPencil,
  IconArrowsMove,
} from '@tabler/icons-react';
import type { AnimationTrack, AnimatableProperty } from '../../types/animation';

export const PROPERTY_LABELS: Record<AnimatableProperty, string> = {
  opacity: 'Opacity',
  translateX: 'Position X',
  translateY: 'Position Y',
  scaleX: 'Scale X',
  scaleY: 'Scale Y',
  rotation: 'Rotation',
  drawProgress: 'Draw',
};

const ic = (Comp: typeof IconEye) => createElement(Comp, { size: 12 });

export const PROPERTY_ICONS: Record<AnimatableProperty, ReactNode> = {
  opacity: ic(IconEye),
  translateX: ic(IconArrowsHorizontal),
  translateY: ic(IconArrowsVertical),
  scaleX: ic(IconArrowsMaximize),
  scaleY: ic(IconArrowsMinimize),
  rotation: ic(IconRotate),
  drawProgress: ic(IconPencil),
};

export const COMPOUND_PAIRS: [AnimatableProperty, AnimatableProperty, string, ReactNode][] = [
  ['translateX', 'translateY', 'Position', ic(IconArrowsMove)],
  ['scaleX', 'scaleY', 'Scale', ic(IconArrowsMaximize)],
];

export type TargetGroup = {
  targetId: string;
  label: string;
  propertyTracks: VisualTrack[];
  allTracks: AnimationTrack[];
};

export type VisualTrack = {
  id: string;
  label: string;
  icon: ReactNode;
  tracks: AnimationTrack[];
  targetId: string;
};

export const TRACK_HEIGHT = 28;
export const HEADER_HEIGHT = 24;
export const TRACK_LIST_WIDTH = 200;
export const MIN_ZOOM = 0.02;
export const MAX_ZOOM = 1;

export function buildTargetGroups(
  tracks: AnimationTrack[],
  targetLabels: Map<string, string>,
  targetOrder: Map<string, number>,
): TargetGroup[] {
  const byTarget = new Map<string, AnimationTrack[]>();
  for (const t of tracks) {
    if (!byTarget.has(t.targetId)) byTarget.set(t.targetId, []);
    byTarget.get(t.targetId)!.push(t);
  }

  const groups: TargetGroup[] = [];
  const seen = new Set<string>();

  // Include every known target, even those without tracks
  for (const [targetId] of targetLabels) {
    seen.add(targetId);
    const targetTracks = byTarget.get(targetId) ?? [];
    const tLabel = targetLabels.get(targetId) ?? targetId;
    const consumed = new Set<string>();
    const propertyTracks: VisualTrack[] = [];

    for (const [propA, propB, pLabel, icon] of COMPOUND_PAIRS) {
      const pair = targetTracks.filter((t) => t.property === propA || t.property === propB);
      if (pair.length > 0) {
        propertyTracks.push({
          id: pair[0].id,
          label: pLabel,
          icon,
          tracks: pair,
          targetId,
        });
        pair.forEach((t) => consumed.add(t.id));
      }
    }

    for (const t of targetTracks) {
      if (consumed.has(t.id)) continue;
      propertyTracks.push({
        id: t.id,
        label: PROPERTY_LABELS[t.property],
        icon: PROPERTY_ICONS[t.property],
        tracks: [t],
        targetId,
      });
    }

    groups.push({
      targetId,
      label: tLabel,
      propertyTracks,
      allTracks: targetTracks,
    });
  }

  // Also include any tracks for targets not in targetLabels (edge case)
  for (const [targetId, targetTracks] of byTarget) {
    if (seen.has(targetId)) continue;
    const tLabel = targetId;
    const consumed = new Set<string>();
    const propertyTracks: VisualTrack[] = [];

    for (const [propA, propB, pLabel, icon] of COMPOUND_PAIRS) {
      const pair = targetTracks.filter((t) => t.property === propA || t.property === propB);
      if (pair.length > 0) {
        propertyTracks.push({
          id: pair[0].id,
          label: pLabel,
          icon,
          tracks: pair,
          targetId,
        });
        pair.forEach((t) => consumed.add(t.id));
      }
    }

    for (const t of targetTracks) {
      if (consumed.has(t.id)) continue;
      propertyTracks.push({
        id: t.id,
        label: PROPERTY_LABELS[t.property],
        icon: PROPERTY_ICONS[t.property],
        tracks: [t],
        targetId,
      });
    }

    groups.push({
      targetId,
      label: tLabel,
      propertyTracks,
      allTracks: targetTracks,
    });
  }

  groups.sort((a, b) => (targetOrder.get(a.targetId) ?? 0) - (targetOrder.get(b.targetId) ?? 0));
  return groups;
}

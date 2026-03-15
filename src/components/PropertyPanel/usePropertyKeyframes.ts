import { useMemo } from 'react';
import type {
  AnimationTrack,
  Keyframe,
  AnimatableProperty,
} from '../../types/animation';
import { PROPERTY_DEFAULTS } from '../../types/animation';
import type { AnimatableTarget } from '../../types/excalidraw';
import { interpolate } from '../../core/engine/InterpolationEngine';

type UsePropertyKeyframesParams = {
  tracks: AnimationTrack[];
  currentTime: number;
  selectedTargets: AnimatableTarget[];
  selectedKeyframes: { track: AnimationTrack; keyframe: Keyframe }[];
  onAddOrUpdateKeyframe: (trackId: string, time: number, value: number) => void;
  onAddTrack: (targetId: string, targetType: 'element' | 'group', property: AnimatableProperty) => void;
  onDeleteKeyframe: (trackId: string, keyframeId: string) => void;
};

export function usePropertyKeyframes({
  tracks,
  currentTime,
  selectedTargets,
  selectedKeyframes,
  onAddOrUpdateKeyframe,
  onAddTrack,
  onDeleteKeyframe,
}: UsePropertyKeyframesParams) {
  const keyframesAtCurrentTime = useMemo(() => {
    const result: { track: AnimationTrack; keyframe: Keyframe }[] = [];
    const explicitIds = new Set(selectedKeyframes.map(sk => sk.keyframe.id));
    const selectedIds = new Set(selectedTargets.map(t => t.id));

    for (const track of tracks) {
      if (!selectedIds.has(track.targetId)) continue;
      for (const kf of track.keyframes) {
        if (Math.abs(kf.time - currentTime) < 1 && !explicitIds.has(kf.id)) {
          result.push({ track, keyframe: kf });
        }
      }
    }
    return result;
  }, [tracks, currentTime, selectedTargets, selectedKeyframes]);

  const allVisibleKeyframes = [...selectedKeyframes, ...keyframesAtCurrentTime];

  const ensureAndSet = (property: AnimatableProperty, value: number) => {
    for (const target of selectedTargets) {
      const track = tracks.find(t => t.targetId === target.id && t.property === property);
      if (track) {
        onAddOrUpdateKeyframe(track.id, currentTime, value);
      } else {
        onAddTrack(target.id, target.type, property);
      }
    }
  };

  const getValue = (property: AnimatableProperty): number => {
    const track = tracks.find(t => t.property === property);
    if (track) return interpolate(track.keyframes, currentTime, track.property);
    return PROPERTY_DEFAULTS[property];
  };

  const hasKeyframeAt = (prop: AnimatableProperty): boolean => {
    return tracks.some(t => t.property === prop && t.keyframes.some(kf => Math.abs(kf.time - currentTime) < 1));
  };

  const toggleKeyframeFor = (prop: AnimatableProperty) => {
    const has = hasKeyframeAt(prop);
    if (has) {
      for (const target of selectedTargets) {
        const track = tracks.find(t => t.targetId === target.id && t.property === prop);
        if (track) {
          const kf = track.keyframes.find(k => Math.abs(k.time - currentTime) < 1);
          if (kf) onDeleteKeyframe(track.id, kf.id);
        }
      }
    } else {
      ensureAndSet(prop, getValue(prop));
    }
  };

  const toggleCompoundKeyframe = (properties: AnimatableProperty[]) => {
    const allHave = properties.every(p => hasKeyframeAt(p));
    for (const prop of properties) {
      if (allHave) {
        for (const target of selectedTargets) {
          const track = tracks.find(t => t.targetId === target.id && t.property === prop);
          if (track) {
            const kf = track.keyframes.find(k => Math.abs(k.time - currentTime) < 1);
            if (kf) onDeleteKeyframe(track.id, kf.id);
          }
        }
      } else if (!hasKeyframeAt(prop)) {
        ensureAndSet(prop, getValue(prop));
      }
    }
  };

  return {
    keyframesAtCurrentTime,
    allVisibleKeyframes,
    ensureAndSet,
    getValue,
    hasKeyframeAt,
    toggleKeyframeFor,
    toggleCompoundKeyframe,
  };
}

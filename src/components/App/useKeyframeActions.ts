import { useCallback } from 'react';
import { notifications } from '@mantine/notifications';
import { computeFrameAtTime } from '../../core/engine/playbackSingleton';
import { useAnimationStore } from '../../stores/animationStore';
import { CAMERA_FRAME_TARGET_ID, useProjectStore } from '../../stores/projectStore';
import { useUIStore } from '../../stores/uiStore';
import { useUndoRedoStore } from '../../stores/undoRedoStore';
import { usePlaybackStore } from '../../stores/playbackStore';
import { PROPERTY_DEFAULTS } from '../../types/animation';
import type { AnimatableProperty, Keyframe } from '../../types/animation';

const LIVE_MODE_MSG_ID = 'live-mode-readonly';

function guardLiveMode(): boolean {
  if (useUIStore.getState().liveMode) {
    notifications.show({
      id: LIVE_MODE_MSG_ID,
      title: 'Live mode is active',
      message: 'Keyframe editing is disabled while connected to the MCP server. Disconnect to edit.',
      color: 'yellow',
      autoClose: 3000,
    });
    return true;
  }
  return false;
}

export function useKeyframeActions(): {
  handleScrub: (time: number) => void;
  handleSelectTrack: (id: string | null) => void;
  handleSelectKeyframes: (ids: string[]) => void;
  handleAddKeyframe: (trackId: string, time: number, value: number) => void;
  handleMoveKeyframe: (trackId: string, kfId: string, newTime: number) => void;
  handleRemoveKeyframe: (trackId: string, kfId: string) => void;
  handleToggleTrackEnabled: (trackId: string) => void;
  handleRemoveTrack: (trackId: string) => void;
  handleUpdateKeyframe: (...args: [string, string, Partial<Pick<Keyframe, 'time' | 'value' | 'easing'>>]) => void;
  handleSelectTarget: (targetId: string) => void;
  handleSelectElements: (ids: string[]) => void;
  handleAddOrUpdateKeyframe: (trackId: string, time: number, value: number) => void;
  handleDragElement: (targetId: string, deltaX: number, deltaY: number) => void;
  handleAddTrackProp: (targetId: string, targetType: 'element' | 'group', property: AnimatableProperty) => void;
  handleResizeElement: (targetId: string, dScaleX: number, dScaleY: number) => void;
} {
  const handleScrub = useCallback((time: number) => {
    computeFrameAtTime(time);
  }, []);

  const handleSelectTrack = useCallback((id: string | null) => {
    useAnimationStore.getState().selectTrack(id);
  }, []);

  const handleSelectKeyframes = useCallback((ids: string[]) => {
    useAnimationStore.getState().selectKeyframes(ids);
  }, []);

  const handleAddKeyframe = useCallback((trackId: string, time: number, value: number) => {
    if (guardLiveMode()) return;
    useUndoRedoStore.getState().pushState();
    useAnimationStore.getState().addKeyframe(trackId, time, value);
  }, []);

  const handleMoveKeyframe = useCallback((trackId: string, kfId: string, newTime: number) => {
    if (guardLiveMode()) return;
    useAnimationStore.getState().moveKeyframe(trackId, kfId, newTime);
  }, []);

  const handleRemoveKeyframe = useCallback((trackId: string, kfId: string) => {
    if (guardLiveMode()) return;
    useUndoRedoStore.getState().pushState();
    useAnimationStore.getState().removeKeyframe(trackId, kfId);
  }, []);

  const handleToggleTrackEnabled = useCallback((trackId: string) => {
    if (guardLiveMode()) return;
    useUndoRedoStore.getState().pushState();
    useAnimationStore.getState().toggleTrackEnabled(trackId);
  }, []);

  const handleRemoveTrack = useCallback((trackId: string) => {
    if (guardLiveMode()) return;
    useUndoRedoStore.getState().pushState();
    useAnimationStore.getState().removeTrack(trackId);
  }, []);

  const handleUpdateKeyframe = useCallback((...args: [string, string, Partial<Pick<Keyframe, 'time' | 'value' | 'easing'>>]) => {
    if (guardLiveMode()) return;
    useUndoRedoStore.getState().pushState();
    useAnimationStore.getState().updateKeyframe(...args);
  }, []);

  const handleSelectTarget = useCallback((targetId: string) => {
    useUIStore.getState().setSelectedElements([targetId]);
  }, []);

  const handleSelectElements = useCallback((ids: string[]) => {
    useUIStore.getState().setSelectedElements(ids);
  }, []);

  const handleAddOrUpdateKeyframe = useCallback((trackId: string, time: number, value: number) => {
    if (guardLiveMode()) return;
    useUndoRedoStore.getState().pushState();
    const store = useAnimationStore.getState();
    const track = store.timeline.tracks.find((t) => t.id === trackId);
    if (!track) return;

    const roundedTime = Math.round(time);
    const existing = track.keyframes.find((kf) => Math.abs(kf.time - roundedTime) < 1);

    if (existing) {
      store.updateKeyframe(trackId, existing.id, { value });
    } else {
      store.addKeyframe(trackId, roundedTime, value);
    }

    if (track.targetId === CAMERA_FRAME_TARGET_ID &&
      (track.property === 'scaleX' || track.property === 'scaleY')) {
      const otherProp = track.property === 'scaleX' ? 'scaleY' : 'scaleX';
      const otherTrack = useAnimationStore.getState().timeline.tracks.find(
        (t) => t.targetId === CAMERA_FRAME_TARGET_ID && t.property === otherProp,
      );
      if (otherTrack) {
        const otherExisting = otherTrack.keyframes.find((kf) => Math.abs(kf.time - roundedTime) < 1);
        if (otherExisting) {
          useAnimationStore.getState().updateKeyframe(otherTrack.id, otherExisting.id, { value });
        } else {
          useAnimationStore.getState().addKeyframe(otherTrack.id, roundedTime, value);
        }
      }
    }
  }, []);

  const handleDragElement = useCallback((targetId: string, deltaX: number, deltaY: number) => {
    if (guardLiveMode()) return;
    useUndoRedoStore.getState().pushState();
    const store = useAnimationStore.getState();
    const time = Math.round(usePlaybackStore.getState().currentTime);
    const target = useProjectStore.getState().targets.find((t) => t.id === targetId);
    const targetType = target?.type ?? 'element';

    const ensureTrackAndSetValue = (property: 'translateX' | 'translateY', value: number) => {
      let track = store.timeline.tracks.find(
        (t) => t.targetId === targetId && t.property === property,
      );
      if (!track) {
        store.addTrack(targetId, targetType, property);
        track = useAnimationStore.getState().timeline.tracks.find(
          (t) => t.targetId === targetId && t.property === property,
        );
      }
      if (!track) return;

      const existing = track.keyframes.find((kf) => Math.abs(kf.time - time) < 1);
      const currentValue = existing?.value ?? 0;
      if (existing) {
        store.updateKeyframe(track.id, existing.id, { value: currentValue + value });
      } else {
        store.addKeyframe(track.id, time, currentValue + value);
      }
    };

    if (Math.abs(deltaX) > 2) ensureTrackAndSetValue('translateX', deltaX);
    if (Math.abs(deltaY) > 2) ensureTrackAndSetValue('translateY', deltaY);
  }, []);

  const handleAddTrackProp = useCallback((targetId: string, targetType: 'element' | 'group', property: AnimatableProperty) => {
    if (guardLiveMode()) return;
    useUndoRedoStore.getState().pushState();
    const store = useAnimationStore.getState();
    const time = Math.round(usePlaybackStore.getState().currentTime);

    if (targetId === CAMERA_FRAME_TARGET_ID && (property === 'scaleX' || property === 'scaleY')) {
      for (const prop of ['scaleX', 'scaleY'] as const) {
        const existing = store.timeline.tracks.find(
          (t) => t.targetId === targetId && t.property === prop,
        );
        if (!existing) {
          store.addTrack(targetId, targetType, prop);
          const newTrack = useAnimationStore.getState().timeline.tracks.find(
            (t) => t.targetId === targetId && t.property === prop,
          );
          if (newTrack) {
            useAnimationStore.getState().addKeyframe(newTrack.id, time, PROPERTY_DEFAULTS[prop]);
          }
        }
      }
      return;
    }

    store.addTrack(targetId, targetType, property);
    const newTrack = useAnimationStore.getState().timeline.tracks.find(
      (t) => t.targetId === targetId && t.property === property,
    );
    if (newTrack) {
      store.addKeyframe(newTrack.id, time, PROPERTY_DEFAULTS[property]);
    }
  }, []);

  const handleResizeElement = useCallback((targetId: string, dScaleX: number, dScaleY: number) => {
    if (guardLiveMode()) return;
    useUndoRedoStore.getState().pushState();
    const store = useAnimationStore.getState();
    const time = Math.round(usePlaybackStore.getState().currentTime);
    const target = useProjectStore.getState().targets.find((t) => t.id === targetId);
    const targetType = target?.type ?? 'element';

    const ensureScaleTrack = (property: 'scaleX' | 'scaleY', delta: number) => {
      let track = store.timeline.tracks.find(
        (t) => t.targetId === targetId && t.property === property,
      );
      if (!track) {
        store.addTrack(targetId, targetType, property);
        track = useAnimationStore.getState().timeline.tracks.find(
          (t) => t.targetId === targetId && t.property === property,
        );
      }
      if (!track) return;
      const existing = track.keyframes.find((kf) => Math.abs(kf.time - time) < 1);
      const currentValue = existing?.value ?? 1;
      const newValue = Math.max(0.1, currentValue + delta);
      if (existing) {
        useAnimationStore.getState().updateKeyframe(track.id, existing.id, { value: newValue });
      } else {
        useAnimationStore.getState().addKeyframe(track.id, time, newValue);
      }
    };

    if (targetId === CAMERA_FRAME_TARGET_ID) {
      const uniformDelta = (dScaleX + dScaleY) / 2;
      ensureScaleTrack('scaleX', uniformDelta);
      ensureScaleTrack('scaleY', uniformDelta);
    } else {
      if (Math.abs(dScaleX) > 0.01) ensureScaleTrack('scaleX', dScaleX);
      if (Math.abs(dScaleY) > 0.01) ensureScaleTrack('scaleY', dScaleY);
    }
  }, []);

  return {
    handleScrub,
    handleSelectTrack,
    handleSelectKeyframes,
    handleAddKeyframe,
    handleMoveKeyframe,
    handleRemoveKeyframe,
    handleToggleTrackEnabled,
    handleRemoveTrack,
    handleUpdateKeyframe,
    handleSelectTarget,
    handleSelectElements,
    handleAddOrUpdateKeyframe,
    handleDragElement,
    handleAddTrackProp,
    handleResizeElement,
  };
}

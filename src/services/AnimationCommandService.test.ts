import { beforeEach, describe, expect, it } from 'vitest';
import type { AnimatableTarget } from '../types/excalidraw';
import { createTimeline } from '../core/models/Timeline';
import {
  getPlaybackController,
  invalidatePlaybackCache,
} from '../core/engine/playbackSingleton';
import { useAnimationStore } from '../stores/animationStore';
import { usePlaybackStore } from '../stores/playbackStore';
import { useProjectStore } from '../stores/projectStore';
import { useUndoRedoStore } from '../stores/undoRedoStore';
import {
  applyPreset,
  createAction,
  createCameraMove,
  deleteAction,
  disableAction,
  detachAction,
  reorderActions,
  updateActionTiming,
} from './AnimationCommandService';

function target(id: string): AnimatableTarget {
  return {
    id,
    type: 'element',
    label: id,
    elementIds: [id],
    originalBounds: {
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      centerX: 50,
      centerY: 50,
    },
    originalAngle: 0,
    zIndex: 0,
  };
}

function fadeDraft(id: string, startMs = 0) {
  return {
    id,
    type: 'fade' as const,
    targetIds: [id.replace('action', 'element')],
    timing: {
      startMs,
      durationMs: 500,
      staggerMs: 0,
      startMode: 'absolute' as const,
    },
  };
}

describe('AnimationCommandService', () => {
  beforeEach(() => {
    getPlaybackController();
    invalidatePlaybackCache();
    useProjectStore.setState({
      targets: [target('element-1'), target('element-2')],
    });
    useAnimationStore.setState({
      timeline: createTimeline('Test', 10_000, 60),
      actions: [],
      timelineRevision: 0,
      documentRevision: 0,
      selectedTrackId: null,
      selectedKeyframeIds: [],
      clipboardKeyframes: [],
      clipStart: 0,
      clipEnd: 10_000,
    });
    usePlaybackStore.setState({
      currentTime: 250,
      frameState: new Map(),
    });
    useUndoRedoStore.getState().clearHistory();
  });

  it('commits one store transaction, one recompute, and one undo entry', () => {
    let animationTransactions = 0;
    let frameRecomputes = 0;
    const unsubscribeAnimation = useAnimationStore.subscribe(() => {
      animationTransactions += 1;
    });
    const unsubscribePlayback = usePlaybackStore.subscribe((state, previous) => {
      if (state.frameState !== previous.frameState) frameRecomputes += 1;
    });

    const result = createAction(fadeDraft('action-1'));

    unsubscribeAnimation();
    unsubscribePlayback();
    expect(result.ok).toBe(true);
    expect(animationTransactions).toBe(1);
    expect(frameRecomputes).toBe(1);
    expect(useUndoRedoStore.getState().past).toHaveLength(1);
    expect(useAnimationStore.getState()).toMatchObject({
      timelineRevision: 1,
      documentRevision: 1,
    });
  });

  it('undoes a command and its authoring metadata in one step', () => {
    expect(createAction(fadeDraft('action-1')).ok).toBe(true);
    expect(useAnimationStore.getState().actions).toHaveLength(1);
    expect(useAnimationStore.getState().timeline.tracks).toHaveLength(1);

    useUndoRedoStore.getState().undo();

    expect(useAnimationStore.getState().actions).toEqual([]);
    expect(useAnimationStore.getState().timeline.tracks).toEqual([]);
  });

  it('reorders and retimes managed content without touching a custom track', () => {
    const customTimeline = {
      ...useAnimationStore.getState().timeline,
      tracks: [
        {
          id: 'custom-track',
          targetId: 'element-1',
          targetType: 'element' as const,
          property: 'opacity' as const,
          enabled: true,
          keyframes: [
            {
              id: 'custom-keyframe',
              time: 5000,
              value: 0.2,
              easing: 'linear' as const,
            },
          ],
        },
      ],
    };
    useAnimationStore.setState({ timeline: customTimeline });
    expect(createAction(fadeDraft('action-1')).ok).toBe(true);
    expect(createAction(fadeDraft('action-2', 1000)).ok).toBe(true);
    const actionIds = useAnimationStore.getState().actions.map((action) => action.id);
    expect(reorderActions([...actionIds].reverse()).ok).toBe(true);
    expect(
      updateActionTiming('action-1', {
        startMs: 2000,
        durationMs: 250,
        staggerMs: 0,
        startMode: 'absolute',
      }).ok,
    ).toBe(true);

    expect(
      useAnimationStore.getState().timeline.tracks.find(
        (track) => track.id === 'custom-track',
      ),
    ).toEqual(customTimeline.tracks[0]);
  });

  it('marks managed content customized before a Studio mutation', () => {
    expect(createAction(fadeDraft('action-1')).ok).toBe(true);
    const generatedTrack = useAnimationStore.getState().timeline.tracks[0]!;
    const generatedKeyframe = generatedTrack.keyframes[0]!;

    useAnimationStore
      .getState()
      .updateKeyframe(generatedTrack.id, generatedKeyframe.id, { value: 0.3 });

    expect(useAnimationStore.getState().actions[0]?.status).toBe('customized');
    const result = updateActionTiming('action-1', {
      startMs: 1000,
      durationMs: 500,
      staggerMs: 0,
      startMode: 'absolute',
    });
    expect(result).toMatchObject({
      ok: false,
      error: { code: 'ACTION_CUSTOMIZED' },
    });
    expect(
      useAnimationStore.getState().timeline.tracks[0]?.keyframes[0]?.value,
    ).toBe(0.3);
  });

  it('detaches customized ownership before its generated track is removed', () => {
    expect(createAction(fadeDraft('action-1')).ok).toBe(true);
    const generatedTrack = useAnimationStore.getState().timeline.tracks[0]!;
    useAnimationStore.getState().updateKeyframe(
      generatedTrack.id,
      generatedTrack.keyframes[0]!.id,
      { value: 0.3 },
    );

    useAnimationStore.getState().removeTrack(generatedTrack.id);

    expect(useAnimationStore.getState().actions[0]).toMatchObject({
      status: 'detached',
      ownership: [],
    });
  });

  it('detaches content without deleting it and deletes only managed ownership', () => {
    expect(createAction(fadeDraft('action-1')).ok).toBe(true);
    const trackId = useAnimationStore.getState().timeline.tracks[0]!.id;
    expect(detachAction('action-1').ok).toBe(true);
    expect(deleteAction('action-1').ok).toBe(true);
    expect(
      useAnimationStore.getState().timeline.tracks.some(
        (track) => track.id === trackId,
      ),
    ).toBe(true);
  });

  it('returns a typed error for invalid target references', () => {
    const result = createAction({
      ...fadeDraft('action-missing'),
      targetIds: ['missing-target'],
    });
    expect(result).toMatchObject({
      ok: false,
      error: { code: 'INVALID_REFERENCE' },
    });
    expect(useUndoRedoStore.getState().past).toHaveLength(0);
  });

  it('supports presets, camera moves, and disabling generated content', () => {
    const preset = applyPreset({
      preset: 'slide-left',
      targetIds: ['element-1'],
      timing: {
        startMs: 0,
        durationMs: 500,
        staggerMs: 0,
        startMode: 'absolute',
      },
    });
    expect(preset.ok).toBe(true);
    const camera = createCameraMove({
      timing: {
        startMs: 1000,
        durationMs: 500,
        staggerMs: 0,
        startMode: 'absolute',
      },
      x: 200,
      scale: 1.5,
    });
    expect(camera.ok).toBe(true);
    const presetId = preset.ok ? preset.value.action?.id : undefined;
    expect(presetId).toBeDefined();
    expect(disableAction(presetId!).ok).toBe(true);
    expect(
      useAnimationStore
        .getState()
        .timeline.tracks.some((track) =>
          useAnimationStore
            .getState()
            .actions.find((action) => action.id === presetId)
            ?.ownership.some((ownership) => ownership.trackId === track.id),
        ),
    ).toBe(false);
  });
});

import { beforeEach, describe, expect, it } from 'vitest';
import type { AnimatableTarget } from '../types/excalidraw';
import { createTimeline } from '../core/models/Timeline';
import {
  computeFrameAtTime,
  getPlaybackController,
  invalidatePlaybackCache,
} from '../core/engine/playbackSingleton';
import { useAnimationStore } from '../stores/animationStore';
import { usePlaybackStore } from '../stores/playbackStore';
import { useProjectStore } from '../stores/projectStore';
import { useUndoRedoStore } from '../stores/undoRedoStore';
import {
  applyPreset,
  applyPresetBatch,
  createAction,
  createCameraMove,
  deleteActions,
  deleteAction,
  disableAction,
  duplicateAction,
  duplicateUnmanagedTrack,
  enableAction,
  detachAction,
  reorderActions,
  setActionsEnabled,
  setUnmanagedTrackEnabled,
  updateActionTiming,
  updateActionTimings,
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
      sceneStates: [],
      sceneTransitions: [],
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

  it('recomputes exactly once when undoing an action-list command', () => {
    expect(createAction(fadeDraft('action-1')).ok).toBe(true);
    let frameRecomputes = 0;
    const unsubscribe = usePlaybackStore.subscribe((state, previous) => {
      if (state.frameState !== previous.frameState) frameRecomputes += 1;
    });

    const result = useUndoRedoStore.getState().undo();
    computeFrameAtTime(result?.time ?? 0);

    unsubscribe();
    expect(frameRecomputes).toBe(1);
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
      useAnimationStore.getState().timeline.tracks.find((track) => track.id === 'custom-track'),
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
    expect(useAnimationStore.getState().timeline.tracks[0]?.keyframes[0]?.value).toBe(0.3);
  });

  it('detaches customized ownership before its generated track is removed', () => {
    expect(createAction(fadeDraft('action-1')).ok).toBe(true);
    const generatedTrack = useAnimationStore.getState().timeline.tracks[0]!;
    useAnimationStore
      .getState()
      .updateKeyframe(generatedTrack.id, generatedTrack.keyframes[0]!.id, { value: 0.3 });

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
    expect(useAnimationStore.getState().timeline.tracks.some((track) => track.id === trackId)).toBe(
      true,
    );
    expect(
      useAnimationStore.getState().timeline.tracks.find((track) => track.id === trackId)
        ?.managedActionId,
    ).toBeUndefined();
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
      useAnimationStore.getState().timeline.tracks.some((track) =>
        useAnimationStore
          .getState()
          .actions.find((action) => action.id === presetId)
          ?.ownership.some((ownership) => ownership.trackId === track.id),
      ),
    ).toBe(false);
  });

  it.each([
    ['fade', 'opacity'],
    ['slide-left', 'translateX'],
    ['slide-right', 'translateX'],
    ['slide-up', 'translateY'],
    ['slide-down', 'translateY'],
    ['draw', 'drawProgress'],
    ['pop', 'scaleX'],
  ] as const)('applies the %s preset through the command service', (preset, property) => {
    const result = applyPreset({
      preset,
      targetIds: ['element-1'],
      timing: {
        startMs: 0,
        durationMs: 500,
        staggerMs: 0,
        startMode: 'absolute',
      },
      easing: 'easeInOut',
    });

    expect(result.ok).toBe(true);
    expect(
      useAnimationStore.getState().timeline.tracks.some((track) => track.property === property),
    ).toBe(true);
  });

  it('applies an auto-animate preset batch as one undoable commit', () => {
    const result = applyPresetBatch([
      {
        preset: 'fade',
        targetIds: ['element-1'],
        timing: {
          startMs: 0,
          durationMs: 400,
          staggerMs: 0,
          startMode: 'absolute',
        },
      },
      {
        preset: 'draw',
        targetIds: ['element-2'],
        timing: {
          startMs: 200,
          durationMs: 500,
          staggerMs: 0,
          startMode: 'absolute',
        },
      },
    ]);

    expect(result.ok).toBe(true);
    expect(useAnimationStore.getState().actions).toHaveLength(2);
    expect(useUndoRedoStore.getState().past).toHaveLength(1);

    useUndoRedoStore.getState().undo();
    expect(useAnimationStore.getState().actions).toEqual([]);
    expect(useAnimationStore.getState().timeline.tracks).toEqual([]);
  });

  it('duplicates and re-enables managed actions through one command each', () => {
    expect(createAction(fadeDraft('action-1')).ok).toBe(true);
    expect(disableAction('action-1').ok).toBe(true);
    expect(useAnimationStore.getState().actions[0]?.status).toBe('disabled');

    const duplicate = duplicateAction('action-1');
    expect(duplicate.ok).toBe(true);
    const duplicateId = duplicate.ok ? duplicate.value.action?.id : undefined;
    expect(duplicateId).toBeDefined();
    expect(useAnimationStore.getState().actions).toHaveLength(2);
    expect(useAnimationStore.getState().actions[1]?.status).toBe('disabled');

    expect(enableAction(duplicateId!).ok).toBe(true);
    expect(useAnimationStore.getState().actions[1]?.status).toBe('managed');
  });

  it('applies bulk timing, enable, and delete as single transactions', () => {
    expect(createAction(fadeDraft('action-1')).ok).toBe(true);
    expect(createAction(fadeDraft('action-2', 1000)).ok).toBe(true);
    useUndoRedoStore.getState().clearHistory();
    let animationTransactions = 0;
    const unsubscribe = useAnimationStore.subscribe(() => {
      animationTransactions += 1;
    });

    expect(
      updateActionTimings([
        {
          actionId: 'action-1',
          timing: {
            startMs: 0,
            durationMs: 300,
            staggerMs: 0,
            startMode: 'absolute',
          },
        },
        {
          actionId: 'action-2',
          timing: {
            startMs: 0,
            durationMs: 300,
            staggerMs: 0,
            startMode: 'withPrevious',
          },
        },
      ]).ok,
    ).toBe(true);
    expect(setActionsEnabled(['action-1', 'action-2'], false).ok).toBe(true);
    expect(deleteActions(['action-1', 'action-2']).ok).toBe(true);

    unsubscribe();
    expect(animationTransactions).toBe(3);
    expect(useUndoRedoStore.getState().past).toHaveLength(3);
    expect(useAnimationStore.getState().actions).toEqual([]);
  });

  it('duplicates and toggles unmanaged tracks without compiling them into actions', () => {
    useAnimationStore.setState({
      timeline: {
        ...useAnimationStore.getState().timeline,
        tracks: [
          {
            id: 'custom-track',
            targetId: 'element-1',
            targetType: 'element',
            property: 'rotation',
            enabled: true,
            keyframes: [
              {
                id: 'custom-keyframe',
                time: 250,
                value: 0.5,
                easing: 'linear',
              },
            ],
          },
        ],
      },
    });

    expect(setUnmanagedTrackEnabled('custom-track', false).ok).toBe(true);
    const duplicate = duplicateUnmanagedTrack('custom-track');
    expect(duplicate.ok).toBe(true);

    const state = useAnimationStore.getState();
    expect(state.actions).toEqual([]);
    expect(state.timeline.tracks).toHaveLength(2);
    expect(state.timeline.tracks[0]?.enabled).toBe(false);
    expect(state.timeline.tracks[1]).toMatchObject({
      targetId: 'element-1',
      property: 'rotation',
      enabled: false,
    });
    expect(state.timeline.tracks[1]?.id).not.toBe('custom-track');
    expect(state.timeline.tracks[1]?.keyframes[0]?.id).not.toBe('custom-keyframe');
    expect(duplicate.ok ? duplicate.value.track?.id : undefined).toBe(state.timeline.tracks[1]?.id);
  });

  it('creates a camera hold through the managed compiler command', () => {
    const result = createCameraMove({
      timing: {
        startMs: 100,
        durationMs: 500,
        staggerMs: 0,
        startMode: 'absolute',
      },
      x: 20,
      y: 40,
      scale: 1.2,
      mode: 'hold',
      preset: 'camera-hold',
    });

    expect(result.ok).toBe(true);
    expect(useAnimationStore.getState().actions[0]).toMatchObject({
      preset: 'camera-hold',
      parameters: { cameraMode: 'hold' },
    });
  });
});

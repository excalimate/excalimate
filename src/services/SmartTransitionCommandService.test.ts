import { beforeEach, describe, expect, it } from 'vitest';
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types';
import { diffSceneStates, sceneStateFingerprint } from '@excalimate/animation-core';
import { createProject } from '../core/models/Project';
import { createTimeline } from '../core/models/Timeline';
import { getPlaybackController } from '../core/engine/playbackSingleton';
import { useAnimationStore } from '../stores/animationStore';
import { useProjectStore } from '../stores/projectStore';
import { usePlaybackStore } from '../stores/playbackStore';
import { useUndoRedoStore } from '../stores/undoRedoStore';
import {
  acceptSmartTransition,
  captureSceneState,
  clearExplicitSceneMapping,
  customizeSmartTransition,
  deleteAction,
  deleteSceneState,
  detachSmartTransition,
  proposeSmartTransition,
  setExplicitSceneMapping,
  updateSceneState,
} from './AnimationCommandService';

function rectangle(id: string, x: number, update: Record<string, unknown> = {}): ExcalidrawElement {
  return {
    id,
    type: 'rectangle',
    x,
    y: 20,
    width: 100,
    height: 60,
    angle: 0,
    strokeColor: '#1e1e1e',
    backgroundColor: '#a5d8ff',
    fillStyle: 'solid',
    strokeWidth: 2,
    strokeStyle: 'solid',
    roughness: 1,
    opacity: 100,
    groupIds: [],
    frameId: null,
    index: null,
    roundness: null,
    seed: 1,
    version: 1,
    versionNonce: 1,
    isDeleted: false,
    boundElements: null,
    updated: 1,
    link: null,
    locked: false,
    ...update,
  } as unknown as ExcalidrawElement;
}

describe('Smart Transition commands', () => {
  beforeEach(() => {
    getPlaybackController();
    const scene = {
      elements: [rectangle('node', 10)],
      appState: {},
      files: {},
    };
    const project = createProject('Transitions', scene);
    useProjectStore.setState({
      project,
      targets: [],
      cameraFrame: project.playback.cameraFrame,
      isDirty: false,
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
    useUndoRedoStore.getState().clearHistory();
  });

  it('captures, proposes, and accepts without mutating the baseline or custom tracks', () => {
    const before = captureSceneState('Before');
    expect(before.ok).toBe(true);
    useProjectStore.getState().updateScene({
      elements: [rectangle('node', 210), rectangle('added', 420)],
      appState: {},
      files: {},
    });
    const after = captureSceneState('After');
    expect(after.ok).toBe(true);
    useProjectStore.getState().updateScene({
      elements: [rectangle('node', 310), rectangle('added', 520)],
      appState: {},
      files: {},
    });
    const [fromState, toState] = useAnimationStore.getState().sceneStates;
    const customTrack = {
      id: 'custom-track',
      targetId: 'node',
      targetType: 'element' as const,
      property: 'rotation' as const,
      enabled: true,
      keyframes: [
        {
          id: 'custom-keyframe',
          time: 4_000,
          value: 0.25,
          easing: 'linear' as const,
        },
      ],
    };
    useAnimationStore.setState((state) => ({
      timeline: { ...state.timeline, tracks: [customTrack] },
    }));
    const proposal = proposeSmartTransition({
      fromStateId: fromState!.id,
      toStateId: toState!.id,
    });
    expect(proposal.ok).toBe(true);
    const transitionId = proposal.ok ? proposal.value.transition.id : '';
    const baseline = structuredClone(useProjectStore.getState().project!.scene);
    useUndoRedoStore.getState().clearHistory();
    let transactions = 0;
    let recomputes = 0;
    const unsubscribe = useAnimationStore.subscribe(() => {
      transactions += 1;
    });
    const unsubscribePlayback = usePlaybackStore.subscribe((state, previous) => {
      if (state.frameState !== previous.frameState) recomputes += 1;
    });

    const accepted = acceptSmartTransition(transitionId);

    unsubscribe();
    unsubscribePlayback();
    expect(accepted.ok).toBe(true);
    expect(transactions).toBe(1);
    expect(recomputes).toBe(1);
    expect(useUndoRedoStore.getState().past).toHaveLength(1);
    expect(useProjectStore.getState().project!.scene).toEqual(baseline);
    expect(
      useAnimationStore.getState().timeline.tracks.find((track) => track.id === customTrack.id),
    ).toEqual(customTrack);
    expect(useAnimationStore.getState().actions[0]).toMatchObject({
      type: 'smartTransition',
      status: 'managed',
      transitionId,
    });
    expect(
      useAnimationStore.getState().timeline.tracks.some((track) => track.property === 'translateX'),
    ).toBe(true);
    expect(
      useAnimationStore
        .getState()
        .timeline.tracks.find(
          (track) => track.targetId === 'node' && track.property === 'translateX',
        )
        ?.keyframes.map((keyframe) => keyframe.value),
    ).toEqual([-300, -100]);
    expect(
      useAnimationStore
        .getState()
        .timeline.tracks.some(
          (track) => track.targetId === 'added' && track.property === 'opacity',
        ),
    ).toBe(true);
  });

  it('requires explicit review for ambiguous heuristic pairs', () => {
    useProjectStore.getState().updateScene({
      elements: [
        rectangle('old-a', 20, { text: 'Service' }),
        rectangle('old-b', 20, { text: 'Service' }),
      ],
      appState: {},
      files: {},
    });
    expect(captureSceneState('Before').ok).toBe(true);
    useProjectStore.getState().updateScene({
      elements: [
        rectangle('new-a', 40, { text: 'Service' }),
        rectangle('new-b', 40, { text: 'Service' }),
      ],
      appState: {},
      files: {},
    });
    expect(captureSceneState('After').ok).toBe(true);
    const [fromState, toState] = useAnimationStore.getState().sceneStates;
    const proposal = proposeSmartTransition({
      fromStateId: fromState!.id,
      toStateId: toState!.id,
    });
    expect(proposal.ok && proposal.value.diff.ambiguousFromElementIds).toEqual(['old-a', 'old-b']);
    const transitionId = proposal.ok ? proposal.value.transition.id : '';
    expect(acceptSmartTransition(transitionId)).toMatchObject({
      ok: false,
      error: { code: 'AMBIGUOUS_MATCH' },
    });

    expect(
      setExplicitSceneMapping(transitionId, {
        fromElementId: 'old-a',
        toElementId: 'new-a',
      }).ok,
    ).toBe(true);
    expect(clearExplicitSceneMapping(transitionId, 'old-a').ok).toBe(true);
    expect(useAnimationStore.getState().sceneTransitions[0]?.mappings).toEqual([]);
    expect(
      setExplicitSceneMapping(transitionId, {
        fromElementId: 'old-a',
        toElementId: 'new-a',
      }).ok,
    ).toBe(true);
    expect(
      setExplicitSceneMapping(transitionId, {
        fromElementId: 'old-b',
        toElementId: 'new-b',
      }).ok,
    ).toBe(true);
    expect(acceptSmartTransition(transitionId).ok).toBe(true);
  });

  it('rejects worker analysis after either captured state changes', () => {
    expect(captureSceneState('Before').ok).toBe(true);
    useProjectStore.getState().updateScene({
      elements: [rectangle('node', 160)],
      appState: {},
      files: {},
    });
    expect(captureSceneState('After').ok).toBe(true);
    const [fromState, toState] = useAnimationStore.getState().sceneStates;
    const diff = diffSceneStates(fromState!, toState!);
    useAnimationStore.setState((state) => ({
      sceneStates: state.sceneStates.map((sceneState) =>
        sceneState.id === fromState!.id
          ? {
              ...sceneState,
              elements: sceneState.elements.map((item) => ({ ...item, x: item.x + 1 })),
            }
          : sceneState,
      ),
    }));

    expect(
      proposeSmartTransition({
        fromStateId: fromState!.id,
        toStateId: toState!.id,
        analysis: {
          diff,
          mappings: [],
          fromStateFingerprint: sceneStateFingerprint(fromState!),
          toStateFingerprint: sceneStateFingerprint(toState!),
        },
      }),
    ).toMatchObject({
      ok: false,
      error: { code: 'INVALID_INPUT' },
    });
  });

  it('customizes and detaches managed content without deleting its tracks', () => {
    expect(captureSceneState('Before').ok).toBe(true);
    useProjectStore.getState().updateScene({
      elements: [rectangle('node', 160)],
      appState: {},
      files: {},
    });

    expect(captureSceneState('After').ok).toBe(true);
    const [fromState, toState] = useAnimationStore.getState().sceneStates;
    const proposal = proposeSmartTransition({
      fromStateId: fromState!.id,
      toStateId: toState!.id,
    });
    const transitionId = proposal.ok ? proposal.value.transition.id : '';
    expect(acceptSmartTransition(transitionId).ok).toBe(true);
    expect(customizeSmartTransition(transitionId).ok).toBe(true);
    expect(useAnimationStore.getState().sceneTransitions[0]?.status).toBe('customized');
    const trackIds = useAnimationStore.getState().timeline.tracks.map((track) => track.id);
    expect(detachSmartTransition(transitionId).ok).toBe(true);
    expect(useAnimationStore.getState().timeline.tracks.map((track) => track.id)).toEqual(trackIds);
    expect(
      useAnimationStore
        .getState()
        .timeline.tracks.every((track) => track.managedActionId === undefined),
    ).toBe(true);
  });

  it('keeps Studio customization and retained tracks free of stale transition ownership', () => {
    expect(captureSceneState('Before').ok).toBe(true);
    useProjectStore.getState().updateScene({
      elements: [rectangle('node', 160)],
      appState: {},
      files: {},
    });
    expect(captureSceneState('After').ok).toBe(true);
    const [fromState, toState] = useAnimationStore.getState().sceneStates;
    const proposal = proposeSmartTransition({
      fromStateId: fromState!.id,
      toStateId: toState!.id,
    });
    const transitionId = proposal.ok ? proposal.value.transition.id : '';
    expect(acceptSmartTransition(transitionId).ok).toBe(true);
    const action = useAnimationStore.getState().actions[0]!;
    const generatedTrack = useAnimationStore
      .getState()
      .timeline.tracks.find((track) => track.managedActionId === action.id)!;
    const keyframe = generatedTrack.keyframes[0]!;

    useAnimationStore.getState().updateKeyframe(generatedTrack.id, keyframe.id, {
      value: keyframe.value + 10,
    });

    expect(useAnimationStore.getState().actions[0]?.status).toBe('customized');
    expect(useAnimationStore.getState().sceneTransitions[0]?.status).toBe('customized');
    const retainedTrackIds = useAnimationStore.getState().timeline.tracks.map((track) => track.id);

    expect(deleteAction(action.id).ok).toBe(true);
    expect(useAnimationStore.getState().sceneTransitions).toEqual([]);
    expect(useAnimationStore.getState().timeline.tracks.map((track) => track.id)).toEqual(
      retainedTrackIds,
    );
    expect(
      useAnimationStore
        .getState()
        .timeline.tracks.every((track) => track.managedActionId === undefined),
    ).toBe(true);
  });

  it('compiles removed tombstones into a visible-to-hidden opacity track', () => {
    expect(captureSceneState('Before').ok).toBe(true);
    useProjectStore.getState().updateScene({
      elements: [rectangle('node', 10, { isDeleted: true })],
      appState: {},
      files: {},
    });
    expect(captureSceneState('After').ok).toBe(true);
    const [fromState, toState] = useAnimationStore.getState().sceneStates;
    const proposal = proposeSmartTransition({
      fromStateId: fromState!.id,
      toStateId: toState!.id,
    });
    const transitionId = proposal.ok ? proposal.value.transition.id : '';

    expect(acceptSmartTransition(transitionId).ok).toBe(true);
    expect(
      useAnimationStore
        .getState()
        .timeline.tracks.find((track) => track.targetId === 'node' && track.property === 'opacity')
        ?.keyframes.map((keyframe) => keyframe.value),
    ).toEqual([1, 0]);
    expect(useProjectStore.getState().project?.scene.elements[0]?.isDeleted).toBe(true);
  });

  it('recaptures an existing state without duplicating it', () => {
    const captured = captureSceneState('Original');
    const sceneStateId = captured.ok ? captured.value.sceneState?.id : '';
    useProjectStore.getState().updateScene({
      elements: [rectangle('node', 320)],
      appState: {},
      files: {},
    });

    const updated = updateSceneState(sceneStateId!, 'Updated');

    expect(updated.ok).toBe(true);
    expect(useAnimationStore.getState().sceneStates).toHaveLength(1);
    expect(useAnimationStore.getState().sceneStates[0]).toMatchObject({
      id: sceneStateId,
      name: 'Updated',
      elements: [expect.objectContaining({ id: 'node', x: 320 })],
    });
  });

  it('deletes states and managed transition ownership in one undo step', () => {
    expect(captureSceneState('Before').ok).toBe(true);
    useProjectStore.getState().updateScene({
      elements: [rectangle('node', 160)],
      appState: {},
      files: {},
    });
    expect(captureSceneState('After').ok).toBe(true);
    const [fromState, toState] = useAnimationStore.getState().sceneStates;
    const proposal = proposeSmartTransition({
      fromStateId: fromState!.id,
      toStateId: toState!.id,
    });
    const transitionId = proposal.ok ? proposal.value.transition.id : '';
    expect(acceptSmartTransition(transitionId).ok).toBe(true);
    useUndoRedoStore.getState().clearHistory();

    expect(deleteSceneState(fromState!.id).ok).toBe(true);

    expect(useUndoRedoStore.getState().past).toHaveLength(1);
    expect(useAnimationStore.getState().sceneTransitions).toEqual([]);
    expect(useAnimationStore.getState().actions).toEqual([]);
    expect(useAnimationStore.getState().timeline.tracks).toEqual([]);
  });
});

import { act, renderHook } from '@testing-library/react';
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types';
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { deserializeProject } from '../../core/utils/serialization';
import { loadProjectDocumentIntoStores } from '../../services/ProjectDocumentService';
import { useAnimationStore } from '../../stores/animationStore';
import { usePlaybackStore } from '../../stores/playbackStore';
import { useProjectStore } from '../../stores/projectStore';
import { useUIStore } from '../../stores/uiStore';
import { useKeyframeActions } from '../App/useKeyframeActions';
import { createSyntheticV2Project } from '../../test-fixtures/projectDocuments';
import type { AnimateEditorRefs } from './ExcalidrawAnimateEditor';
import { useExcalidrawChangeBridge } from './useExcalidrawChangeBridge';

const ARROW_ID = 'persisted-arrow';

function createPersistedArrowProject(scaleValue?: number): string {
  const document = createSyntheticV2Project();
  document.preferredWorkspace = 'studio';
  document.scene.elements = [
    {
      id: ARROW_ID,
      type: 'arrow',
      x: 20,
      y: 30,
      width: 100,
      height: 100,
      angle: 0,
      isDeleted: false,
      points: [
        [0, 0],
        [100, 100],
      ],
      startBinding: null,
      endBinding: null,
    },
  ];
  document.timeline.tracks =
    scaleValue === undefined
      ? []
      : [
          {
            id: 'persisted-scale-track',
            targetId: ARROW_ID,
            targetType: 'element',
            property: 'scaleX',
            enabled: true,
            keyframes: [
              {
                id: 'persisted-scale-keyframe',
                time: 0,
                value: scaleValue,
                easing: 'linear',
              },
            ],
          },
        ];
  return JSON.stringify(document);
}

function createEditorRefs(): AnimateEditorRefs {
  return {
    apiRef: { current: {} as ExcalidrawImperativeAPI },
    programmaticVersionRef: { current: 0 },
    lastProcessedVersionRef: { current: 0 },
    lastAnimatedRef: {
      current: new Map([[ARROW_ID, { x: 20, y: 30, width: 100, height: 100, angle: 0 }]]),
    },
    lastElementOrderRef: { current: ARROW_ID },
    initialRenderDoneRef: { current: true },
    sceneRef: { current: null },
    targetsRef: { current: [] },
    frameStateRef: { current: new Map() },
    onSelectRef: { current: vi.fn() },
    onDragRef: { current: vi.fn() },
    onResizeRef: { current: vi.fn() },
    onRotateRef: { current: vi.fn() },
    isDraggingRef: { current: false },
  };
}

function normalizedArrow(): ExcalidrawElement {
  return {
    id: ARROW_ID,
    type: 'arrow',
    x: 20,
    y: 30,
    width: 0,
    height: 0,
    angle: 0,
    isDeleted: false,
    points: [
      [0, 0],
      [0, 0],
    ],
  } as unknown as ExcalidrawElement;
}

function renderPersistedLoadBridge(refs: AnimateEditorRefs) {
  return renderHook(() => {
    const { handleSelectElements, handleDragElement, handleResizeElement, handleRotateElement } =
      useKeyframeActions();
    refs.onSelectRef.current = handleSelectElements;
    refs.onDragRef.current = handleDragElement;
    refs.onResizeRef.current = handleResizeElement;
    refs.onRotateRef.current = handleRotateElement;
    return useExcalidrawChangeBridge({
      refs,
      setViewport: vi.fn(),
    });
  });
}

function loadPersistedProject(json: string, refs: AnimateEditorRefs): void {
  const project = deserializeProject(json);
  loadProjectDocumentIntoStores(project, { activateAnimationMode: false });
  refs.sceneRef.current = project.scene;
  refs.targetsRef.current = useProjectStore.getState().targets;
  refs.lastAnimatedRef.current = new Map([
    [ARROW_ID, { x: 20, y: 30, width: 100, height: 100, angle: 0 }],
  ]);
  refs.lastElementOrderRef.current = ARROW_ID;
  refs.initialRenderDoneRef.current = true;
  refs.programmaticVersionRef.current = 0;
  refs.lastProcessedVersionRef.current = 0;
}

function fireLoadNormalization(changeHandler: ReturnType<typeof useExcalidrawChangeBridge>): void {
  act(() => {
    changeHandler([normalizedArrow()], {
      selectedElementIds: { [ARROW_ID]: true },
      selectedGroupIds: {},
    });
  });
}

describe('useExcalidrawChangeBridge persisted project loads', () => {
  beforeEach(() => {
    usePlaybackStore.setState({
      currentTime: 0,
      state: 'stopped',
      speed: 1,
      loopMode: 'none',
      frameState: new Map(),
    });
    useUIStore.setState({
      liveMode: false,
      selectedElementIds: [],
    });
  });

  it('does not insert scale keyframes when a persisted arrow is normalized after load', () => {
    const json = createPersistedArrowProject();
    const refs = createEditorRefs();
    const { result } = renderPersistedLoadBridge(refs);

    loadPersistedProject(json, refs);
    fireLoadNormalization(result.current);
    expect(useAnimationStore.getState().timeline.tracks).toEqual([]);

    loadPersistedProject(json, refs);
    fireLoadNormalization(result.current);
    expect(useAnimationStore.getState().timeline.tracks).toEqual([]);
  });

  it('preserves legitimate persisted scale keyframes across repeated loads', () => {
    const json = createPersistedArrowProject(0.75);
    const refs = createEditorRefs();
    const { result } = renderPersistedLoadBridge(refs);

    loadPersistedProject(json, refs);
    fireLoadNormalization(result.current);
    expect(useAnimationStore.getState().timeline.tracks[0]?.keyframes[0]?.value).toBe(0.75);

    loadPersistedProject(json, refs);
    fireLoadNormalization(result.current);
    expect(useAnimationStore.getState().timeline.tracks[0]?.keyframes[0]?.value).toBe(0.75);
  });

  it('still converts an active pointer resize into scale keyframes', () => {
    const refs = createEditorRefs();
    refs.isDraggingRef.current = true;
    const { result } = renderPersistedLoadBridge(refs);

    loadPersistedProject(createPersistedArrowProject(), refs);
    fireLoadNormalization(result.current);

    expect(
      useAnimationStore
        .getState()
        .timeline.tracks.map((track) => [track.property, track.keyframes[0]?.value]),
    ).toEqual([
      ['scaleX', 0.1],
      ['scaleY', 0.1],
    ]);
  });
});

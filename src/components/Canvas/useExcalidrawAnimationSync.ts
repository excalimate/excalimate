import { useEffect } from 'react';
import { getNonDeletedElements } from '@excalidraw/excalidraw';
import type { ExcalidrawElement, NonDeletedExcalidrawElement } from '@excalidraw/excalidraw/element/types';
import { applyAnimationToElements } from '../../core/engine/renderUtils';
import { usePlaybackStore } from '../../stores/playbackStore';
import { useProjectStore } from '../../stores/projectStore';
import { useUIStore } from '../../stores/uiStore';
import type { ExcalidrawSceneData } from '../../types/excalidraw';
import type { FrameState } from '../../types/animation';
import type { AnimatableTarget } from '../../types/excalidraw';
import type { AnimateEditorRefs } from './ExcalidrawAnimateEditor';

export function useExcalidrawAnimationSync(params: {
  ready: boolean;
  scene: ExcalidrawSceneData | null;
  frameState: FrameState;
  targets: AnimatableTarget[];
  selectedElementIds: string[];
  refs: AnimateEditorRefs;
}): void {
  const { ready, scene, frameState, targets, selectedElementIds, refs } = params;
  const {
    apiRef,
    initialRenderDoneRef,
    lastAnimatedRef,
    lastElementOrderRef,
    programmaticVersionRef,
    frameStateRef,
    targetsRef,
    sceneRef,
  } = refs;

  useEffect(() => {
    if (!ready || !apiRef.current || !scene) return;

    const api = apiRef.current;
    const elements = getNonDeletedElements(
      scene.elements as ExcalidrawElement[],
    ) as NonDeletedExcalidrawElement[];

    if (elements.length === 0) return;

    // Skip the very first call — initialData already rendered the elements
    // on the canvas. Calling api.updateScene() immediately after mount
    // breaks Excalidraw's canvas rendering in v0.18.
    if (!initialRenderDoneRef.current) {
      initialRenderDoneRef.current = true;
      // Still set up tracking refs
      const posMap = new Map<string, { x: number; y: number; width: number; height: number }>();
      for (const el of elements) {
        posMap.set(el.id, { x: el.x, y: el.y, width: el.width, height: el.height });
      }
      lastAnimatedRef.current = posMap;
      lastElementOrderRef.current = elements.map(el => el.id).join(',');
      return;
    }

    const latestFrameState = usePlaybackStore.getState().frameState;
    const latestTargets = useProjectStore.getState().targets;

    let animated = applyAnimationToElements(elements, latestFrameState, latestTargets);

    // Clamp minimum opacity to 1 (out of 100) for the canvas preview.
    animated = animated.map(el => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const opacity = (el as any).opacity ?? 100;
      if (opacity < 1) {
        return { ...el, opacity: 1 } as typeof el;
      }
      return el;
    });

    // Ghost mode: make hidden elements more visible for authoring
    const ghostMode = useUIStore.getState().ghostMode;
    if (ghostMode) {
      animated = animated.map(el => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const opacity = (el as any).opacity ?? 100;
        if (opacity < 15) {
          return { ...el, opacity: 15 } as typeof el;
        }
        return el;
      });
    }

    const posMap = new Map<string, { x: number; y: number; width: number; height: number }>();
    for (const el of animated) {
      posMap.set(el.id, { x: el.x, y: el.y, width: el.width, height: el.height });
    }
    lastAnimatedRef.current = posMap;
    lastElementOrderRef.current = elements.map(el => el.id).join(',');

    programmaticVersionRef.current++;
    api.updateScene({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      elements: animated as any,
    });
  }, [ready, scene, frameState, targets, apiRef, initialRenderDoneRef, lastAnimatedRef, lastElementOrderRef, programmaticVersionRef]);

  // Re-apply when ghost mode toggles
  useEffect(() => {
    return useUIStore.subscribe((s, prev) => {
      if (s.ghostMode !== prev.ghostMode && apiRef.current && sceneRef.current) {
        const api = apiRef.current;
        const sc = sceneRef.current;
        const elements = getNonDeletedElements(sc.elements as ExcalidrawElement[]) as NonDeletedExcalidrawElement[];
        let animated = applyAnimationToElements(elements, frameStateRef.current, targetsRef.current);
        // Always clamp min opacity (see main useEffect comment for why)
        const minOpacity = s.ghostMode ? 15 : 1;
        animated = animated.map(el => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const opacity = (el as any).opacity ?? 100;
          return opacity < minOpacity ? { ...el, opacity: minOpacity } as typeof el : el;
        });
        programmaticVersionRef.current++;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        api.updateScene({ elements: animated as any });
      }
    });
  }, [apiRef, frameStateRef, programmaticVersionRef, sceneRef, targetsRef]);

  // ── Sync selection TO Excalidraw ───────────────────────────────
  useEffect(() => {
    if (!ready || !apiRef.current) return;

    const api = apiRef.current;
    const appState = api.getAppState();
    const currentSelected = Object.keys(appState.selectedElementIds || {}).filter(
      id => (appState.selectedElementIds as Record<string, boolean>)[id],
    );

    // Only update if different (avoid infinite loop)
    const same = currentSelected.length === selectedElementIds.length &&
      currentSelected.every(id => selectedElementIds.includes(id));

    if (!same) {
      programmaticVersionRef.current++;
      const selectedMap: Record<string, boolean> = {};
      for (const id of selectedElementIds) selectedMap[id] = true;
      api.updateScene({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        appState: { selectedElementIds: selectedMap } as any,
      });
    }
  }, [ready, selectedElementIds, apiRef, programmaticVersionRef]);
}


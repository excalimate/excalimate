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

    // Skip the very first api.updateScene() call — initialData already
    // rendered the animated elements on the canvas. Calling api.updateScene()
    // immediately after mount breaks Excalidraw's canvas rendering in v0.18.
    // BUT we must set up tracking refs with the ANIMATED positions (matching
    // what Excalidraw actually rendered from initialData).
    if (!initialRenderDoneRef.current) {
      initialRenderDoneRef.current = true;
      const latestFrame = usePlaybackStore.getState().frameState;
      const latestTgts = useProjectStore.getState().targets;
      const animated = applyAnimationToElements(elements, latestFrame, latestTgts);
      const posMap = new Map<string, { x: number; y: number; width: number; height: number; angle: number }>();
      for (const el of animated) {
        posMap.set(el.id, { x: el.x, y: el.y, width: el.width, height: el.height, angle: el.angle ?? 0 });
      }
      lastAnimatedRef.current = posMap;
      lastElementOrderRef.current = elements.map(el => el.id).join(',');
      return;
    }

    const latestFrameState = usePlaybackStore.getState().frameState;
    const latestTargets = useProjectStore.getState().targets;

    let animated = applyAnimationToElements(elements, latestFrameState, latestTargets);

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

    const posMap = new Map<string, { x: number; y: number; width: number; height: number; angle: number }>();
    for (const el of animated) {
      posMap.set(el.id, { x: el.x, y: el.y, width: el.width, height: el.height, angle: el.angle ?? 0 });
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
        if (s.ghostMode) {
          animated = animated.map(el => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const opacity = (el as any).opacity ?? 100;
            return opacity < 15 ? { ...el, opacity: 15 } as typeof el : el;
          });
        }
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

    // Build a target lookup map (O(1) per ID instead of O(n) find)
    const targetById = new Map<string, AnimatableTarget>();
    for (const t of targets) targetById.set(t.id, t);

    // Resolve group IDs to their member element IDs + track which
    // Excalidraw groupIds should be marked as selected groups.
    const resolvedSet = new Set<string>();
    const groupIdSet = new Set<string>();

    for (const id of selectedElementIds) {
      const target = targetById.get(id);
      if (target?.type === 'group') {
        groupIdSet.add(id);
        for (const eid of target.elementIds) resolvedSet.add(eid);
      } else {
        resolvedSet.add(id);
      }
    }

    const appState = api.getAppState();
    const currentSelected = new Set(
      Object.keys(appState.selectedElementIds || {}).filter(
        id => (appState.selectedElementIds as Record<string, boolean>)[id],
      ),
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawGroupIds = (appState as any).selectedGroupIds;
    const currentGroups = new Set<string>(
      rawGroupIds ? Object.keys(rawGroupIds).filter((id: string) => rawGroupIds[id]) : [],
    );

    // Only update if different (avoid infinite loop)
    let sameElements = resolvedSet.size === currentSelected.size;
    if (sameElements) {
      for (const id of resolvedSet) { if (!currentSelected.has(id)) { sameElements = false; break; } }
    }
    let sameGroups = groupIdSet.size === currentGroups.size;
    if (sameGroups) {
      for (const id of groupIdSet) { if (!currentGroups.has(id)) { sameGroups = false; break; } }
    }

    if (!sameElements || !sameGroups) {
      programmaticVersionRef.current++;
      const selectedMap: Record<string, boolean> = {};
      for (const id of resolvedSet) selectedMap[id] = true;
      const groupMap: Record<string, boolean> = {};
      for (const id of groupIdSet) groupMap[id] = true;
      api.updateScene({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        appState: { selectedElementIds: selectedMap, selectedGroupIds: groupMap } as any,
      });
    }
  }, [ready, selectedElementIds, targets, apiRef, programmaticVersionRef]);
}


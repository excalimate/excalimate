import { useCallback, useRef } from 'react';
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types';
import { setCanvasViewport } from './canvasViewport';
import { useProjectStore } from '../../stores/projectStore';
import { extractTargets } from './extractTargets';
import type { AnimateEditorRefs } from './ExcalidrawAnimateEditor';

export function useExcalidrawChangeBridge(params: {
  refs: AnimateEditorRefs;
  setViewport: (v: { scrollX: number; scrollY: number; zoom: number; width: number; height: number }) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
}): (elements: readonly ExcalidrawElement[], appState: any) => void {
  const { refs, setViewport } = params;
  const {
    apiRef,
    programmaticVersionRef,
    lastProcessedVersionRef,
    onSelectRef,
    sceneRef,
    lastElementOrderRef,
    lastAnimatedRef,
    onDragRef,
    onResizeRef,
  } = refs;

  const lastSelectionRef = useRef<string[]>([]);
  const lastGroupSignatureRef = useRef<string>('');

  return useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (elements: readonly ExcalidrawElement[], appState: any) => {
      // Always track viewport state (even during our own updates)
      if (appState) {
        const vp = {
          scrollX: appState.scrollX ?? 0,
          scrollY: appState.scrollY ?? 0,
          zoom: appState.zoom?.value ?? 1,
          width: appState.width ?? 0,
          height: appState.height ?? 0,
        };
        setViewport(vp);
        setCanvasViewport('animate', { scrollX: vp.scrollX, scrollY: vp.scrollY, zoom: vp.zoom });
      }

      // Ignore changes triggered by our own updateScene calls.
      // If the programmatic version has advanced since we last processed
      // a user edit, this onChange is from our own updateScene — skip it.
      // This is deterministic (no timing dependency) and handles any number
      // of onChange fires per updateScene call.
      if (programmaticVersionRef.current !== lastProcessedVersionRef.current) {
        lastProcessedVersionRef.current = programmaticVersionRef.current;
        return;
      }
      if (!apiRef.current) return;

      // Report selection changes.
      // When Excalidraw has selectedGroupIds, report the group IDs instead
      // of the individual member element IDs — so the LayersPanel highlights
      // the group, not the children.
      if (appState?.selectedElementIds) {
        const rawElementIds = Object.keys(appState.selectedElementIds).filter(
          (id: string) => appState.selectedElementIds[id],
        );

        // Check if Excalidraw has group selection active
        const excalGroupIds: string[] = appState.selectedGroupIds
          ? Object.keys(appState.selectedGroupIds).filter(
              (id: string) => appState.selectedGroupIds[id],
            )
          : [];

        let reportedIds: string[];
        if (excalGroupIds.length > 0) {
          // Report the group IDs — these match our AnimatableTarget group IDs
          // since extractTargets uses the same Excalidraw groupIds as keys
          reportedIds = excalGroupIds;
        } else {
          reportedIds = rawElementIds;
        }

        const prev = lastSelectionRef.current;
        if (reportedIds.length !== prev.length || reportedIds.some((id, i) => id !== prev[i])) {
          lastSelectionRef.current = reportedIds;
          onSelectRef.current(reportedIds);
        }
      }

      // Detect z-order changes (send to front/back) and update the source scene.
      // Skip on first onChange (lastElementOrderRef is still empty) — that is the
      // initial render from initialData and must not trigger a store update.
      const nonDeleted = elements.filter(el => !el.isDeleted);
      const currentOrder = nonDeleted.map(el => el.id).join(',');
      if (!lastElementOrderRef.current) {
        // First onChange after mount — just initialize, don't process
        lastElementOrderRef.current = currentOrder;
      } else if (currentOrder !== lastElementOrderRef.current) {
        // Only process if element count is the same (genuine reorder, not a
        // framework artifact like an empty onChange during updateScene transitions).
        const prevIds = lastElementOrderRef.current.split(',');
        lastElementOrderRef.current = currentOrder;
        if (nonDeleted.length > 0 && nonDeleted.length === prevIds.length) {
          const currentScene = sceneRef.current;
          if (currentScene) {
            // Restore original element properties (opacity, position, etc.) from the base scene
            // because Excalidraw's elements have animated values baked in
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const origMap = new Map<string, any>();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            for (const el of currentScene.elements as any[]) origMap.set(el.id, el);

            const restoredElements = nonDeleted.map(el => {
              const orig = origMap.get(el.id);
              if (orig) return { ...orig }; // Use original properties, just adopt new array order
              return el; // New element, keep as-is
            });

            const reorderedScene = {
              ...currentScene,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              elements: restoredElements as any,
            };
            useProjectStore.getState().updateScene(reorderedScene);
          }
          const newTargets = extractTargets(nonDeleted);
          useProjectStore.getState().setTargets(newTargets);
        }
      }

      // Detect group changes — re-extract targets when groupIds change.
      // This catches Excalidraw group/ungroup operations that don't affect z-order.
      // Skip if z-order detection already re-extracted targets above.
      if (currentOrder === lastElementOrderRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const groupSig = nonDeleted.map(el => `${el.id}:${((el as any).groupIds ?? []).join('|')}`).join(',');
        if (lastGroupSignatureRef.current && groupSig !== lastGroupSignatureRef.current) {
          const newTargets = extractTargets(nonDeleted);
          useProjectStore.getState().setTargets(newTargets);
        }
        lastGroupSignatureRef.current = groupSig;
      } else {
        // z-order changed and targets were re-extracted — update group sig to match
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        lastGroupSignatureRef.current = nonDeleted.map(el => `${el.id}:${((el as any).groupIds ?? []).join('|')}`).join(',');
      }

      // Detect user edits: compare current element positions with last animated positions
      const lastAnimated = lastAnimatedRef.current;
      if (lastAnimated.size === 0) return;

      for (const el of elements) {
        if (el.isDeleted) continue;
        const last = lastAnimated.get(el.id);
        if (!last) continue;

        const dx = el.x - last.x;
        const dy = el.y - last.y;
        const dw = last.width !== 0 ? el.width / last.width : 1;
        const dh = last.height !== 0 ? el.height / last.height : 1;

        // Position change → create translate keyframe
        if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
          onDragRef.current(el.id, dx, dy);
        }

        // Size change → create scale keyframe
        if (Math.abs(dw - 1) > 0.02 || Math.abs(dh - 1) > 0.02) {
          onResizeRef.current(el.id, dw - 1, dh - 1);
        }
      }
    },
    [apiRef, lastAnimatedRef, lastElementOrderRef, lastProcessedVersionRef, onDragRef, onResizeRef, onSelectRef, programmaticVersionRef, sceneRef, setViewport],
  );
}


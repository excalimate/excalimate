/**
 * ExcalidrawAnimateEditor — Excalidraw editor for animate mode.
 *
 * Uses the real Excalidraw component as the canvas, giving us all native
 * capabilities (arrow routing, binding, resize, text editing, etc.) for free.
 *
 * Animation is applied by updating Excalidraw's elements with animated
 * positions/scales/rotations. User edits are intercepted and converted
 * to animation keyframe changes.
 *
 * Architecture:
 * 1. Maintain ORIGINAL scene (source of truth for element base state)
 * 2. On each animation frame, compute animated elements and feed to Excalidraw
 * 3. When user edits elements in Excalidraw, compute the DELTA from the
 *    animated position and create keyframes for that delta
 */

import { useCallback, useRef, useEffect, useState } from 'react';
import { Excalidraw } from '@excalidraw/excalidraw';
import '@excalidraw/excalidraw/index.css';
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types';
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types';
import type { ExcalidrawSceneData } from '../../types/excalidraw';
import type { FrameState } from '../../types/animation';
import type { AnimatableTarget } from '../../types/excalidraw';
import type { CameraFrame } from '../../stores/projectStore';
import { CAMERA_FRAME_TARGET_ID, getFrameHeight, useProjectStore } from '../../stores/projectStore';
import { applyAnimationToElements } from '../../core/engine/renderUtils';
import { useUIStore } from '../../stores/uiStore';
import { useUndoRedoStore } from '../../stores/undoRedoStore';
import { getNonDeletedElements } from '@excalidraw/excalidraw';
import type { NonDeletedExcalidrawElement } from '@excalidraw/excalidraw/element/types';
import { extractTargets } from './ExcalidrawEditor';

interface ExcalidrawAnimateEditorProps {
  /** Original scene data (un-animated, source of truth) */
  scene: ExcalidrawSceneData | null;
  /** All animatable targets */
  targets: AnimatableTarget[];
  /** Current animation frame state */
  frameState: FrameState;
  /** Currently selected element IDs */
  selectedElementIds: string[];
  /** Camera frame definition */
  cameraFrame: CameraFrame;
  /** Callbacks */
  onSelectElements: (ids: string[]) => void;
  onDragElement: (targetId: string, deltaX: number, deltaY: number) => void;
  onResizeElement: (targetId: string, dScaleX: number, dScaleY: number) => void;
}

export function ExcalidrawAnimateEditor({
  scene,
  targets,
  frameState,
  selectedElementIds,
  cameraFrame,
  onSelectElements,
  onDragElement,
  onResizeElement,
}: ExcalidrawAnimateEditorProps) {
  const apiRef = useRef<ExcalidrawImperativeAPI | null>(null);
  const updateCountRef = useRef(0); // Counter to ignore our own onChange callbacks
  const lastAnimatedRef = useRef<Map<string, { x: number; y: number; width: number; height: number }>>(new Map());
  const lastElementOrderRef = useRef<string>(''); // Track z-order changes
  const [ready, setReady] = useState(false);
  const [viewport, setViewport] = useState({ scrollX: 0, scrollY: 0, zoom: 1, width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Stable callback refs
  const onSelectRef = useRef(onSelectElements);
  const onDragRef = useRef(onDragElement);
  const onResizeRef = useRef(onResizeElement);
  useEffect(() => { onSelectRef.current = onSelectElements; }, [onSelectElements]);
  useEffect(() => { onDragRef.current = onDragElement; }, [onDragElement]);
  useEffect(() => { onResizeRef.current = onResizeElement; }, [onResizeElement]);

  // Stable refs for animation data
  const sceneRef = useRef(scene);
  const targetsRef = useRef(targets);
  const frameStateRef = useRef(frameState);
  useEffect(() => { sceneRef.current = scene; }, [scene]);
  useEffect(() => { targetsRef.current = targets; }, [targets]);
  useEffect(() => { frameStateRef.current = frameState; }, [frameState]);

  // ── API Ready ──────────────────────────────────────────────────

  const handleApiReady = useCallback((api: ExcalidrawImperativeAPI) => {
    apiRef.current = api;
    setReady(true);
  }, []);

  // ── Apply animation to Excalidraw scene ────────────────────────

  useEffect(() => {
    if (!ready || !apiRef.current || !scene) return;

    const api = apiRef.current;
    const elements = getNonDeletedElements(
      scene.elements as ExcalidrawElement[],
    ) as NonDeletedExcalidrawElement[];

    if (elements.length === 0) return;

    // Apply animation transforms to element clones
    let animated = applyAnimationToElements(elements, frameState, targets);

    // Debug: log first element's opacity to trace the issue
    if (import.meta.env.DEV && animated.length > 0) {
      const first = animated.find((el: any) => el.type !== 'text') ?? animated[0];
      const baseEl = elements.find(e => e.id === first.id);
      console.debug('[AnimateEditor] opacity check', {
        id: first.id.slice(0, 10),
        baseOpacity: (baseEl as any)?.opacity,
        animatedOpacity: (first as any).opacity,
        frameStateHas: frameState.has(first.id),
        frameStateOpacity: frameState.get(first.id)?.opacity,
      });
    }

    // Ghost mode: ensure hidden elements stay visible at minimum opacity
    const ghostMode = useUIStore.getState().ghostMode;
    if (ghostMode) {
      animated = animated.map(el => {
        const opacity = (el as any).opacity ?? 100;
        if (opacity < 15) {
          return { ...el, opacity: 15 } as typeof el;
        }
        return el;
      });
    }

    // Track animated positions for delta computation on user edit
    const posMap = new Map<string, { x: number; y: number; width: number; height: number }>();
    for (const el of animated) {
      posMap.set(el.id, { x: el.x, y: el.y, width: el.width, height: el.height });
    }
    lastAnimatedRef.current = posMap;

    // Initialize element order tracking so first onChange doesn't trigger false z-order change
    if (!lastElementOrderRef.current) {
      lastElementOrderRef.current = elements.map(el => el.id).join(',');
    }

    // Update Excalidraw's scene with animated elements
    updateCountRef.current++;
    api.updateScene({
      elements: animated as any,
    });
  }, [ready, scene, frameState, targets]);

  // Re-apply when ghost mode toggles
  useEffect(() => {
    return useUIStore.subscribe((s, prev) => {
      if (s.ghostMode !== prev.ghostMode && apiRef.current && sceneRef.current) {
        // Trigger re-render by bumping a dependency — just call the animation update
        const api = apiRef.current;
        const sc = sceneRef.current;
        const elements = getNonDeletedElements(sc.elements as ExcalidrawElement[]) as NonDeletedExcalidrawElement[];
        let animated = applyAnimationToElements(elements, frameStateRef.current, targetsRef.current);
        if (s.ghostMode) {
          animated = animated.map(el => {
            const opacity = (el as any).opacity ?? 100;
            return opacity < 15 ? { ...el, opacity: 15 } as typeof el : el;
          });
        }
        updateCountRef.current++;
        api.updateScene({ elements: animated as any });
      }
    });
  }, []);

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
      updateCountRef.current++;
      const selectedMap: Record<string, boolean> = {};
      for (const id of selectedElementIds) selectedMap[id] = true;
      api.updateScene({
        appState: { selectedElementIds: selectedMap } as any,
      });
    }
  }, [ready, selectedElementIds]);

  // ── Handle Excalidraw onChange ──────────────────────────────────

  const handleChange = useCallback(
    (elements: readonly ExcalidrawElement[], appState: any) => {
      // Always track viewport state (even during our own updates)
      if (appState) {
        setViewport({
          scrollX: appState.scrollX ?? 0,
          scrollY: appState.scrollY ?? 0,
          zoom: appState.zoom?.value ?? 1,
          width: appState.width ?? 0,
          height: appState.height ?? 0,
        });
      }

      // Ignore changes triggered by our own updateScene calls
      if (updateCountRef.current > 0) { updateCountRef.current--; return; }
      if (!apiRef.current) return;

      // Report selection changes
      if (appState?.selectedElementIds) {
        const selectedIds = Object.keys(appState.selectedElementIds).filter(
          (id: string) => appState.selectedElementIds[id],
        );
        onSelectRef.current(selectedIds);
      }

      // Detect z-order changes (send to front/back) and update the source scene
      const nonDeleted = elements.filter(el => !el.isDeleted);
      const currentOrder = nonDeleted.map(el => el.id).join(',');
      if (currentOrder !== lastElementOrderRef.current) {
        lastElementOrderRef.current = currentOrder;
        const currentScene = sceneRef.current;
        if (currentScene) {
          // Restore original element properties (opacity, position, etc.) from the base scene
          // because Excalidraw's elements have animated values baked in
          const origMap = new Map<string, any>();
          for (const el of currentScene.elements as any[]) origMap.set(el.id, el);

          const restoredElements = nonDeleted.map(el => {
            const orig = origMap.get(el.id);
            if (orig) return { ...orig }; // Use original properties, just adopt new array order
            return el; // New element, keep as-is
          });

          const reorderedScene = {
            ...currentScene,
            elements: restoredElements as any,
          };
          useProjectStore.getState().updateScene(reorderedScene);
        }
        const newTargets = extractTargets(nonDeleted);
        useProjectStore.getState().setTargets(newTargets);
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
    [],
  );

  // ── Camera frame drag/resize ──────────────────────────────────

  const camDragRef = useRef<{ startX: number; startY: number; handle?: string } | null>(null);
  const [camDragOffset, setCamDragOffset] = useState<{ dx: number; dy: number; dScale: number } | null>(null);

  const handleCameraMouseDown = useCallback((e: React.MouseEvent, handle?: string) => {
    e.stopPropagation();
    useUndoRedoStore.getState().pushState();
    camDragRef.current = { startX: e.clientX, startY: e.clientY, handle };
    if (!selectedElementIds.includes(CAMERA_FRAME_TARGET_ID)) {
      onSelectRef.current([CAMERA_FRAME_TARGET_ID]);
    }
  }, [selectedElementIds]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!camDragRef.current) return;
      const camDrag = camDragRef.current;
      const { zoom: z } = viewport;
      if (camDrag.handle) {
        const dx = e.clientX - camDrag.startX;
        const dy = e.clientY - camDrag.startY;
        const corner = camDrag.handle.replace('resize-', '');
        const isRight = corner.includes('e');
        const isBottom = corner.includes('s');
        const primaryDelta = isRight ? dx : -dx;
        const secondaryDelta = isBottom ? dy : -dy;
        setCamDragOffset({ dx: 0, dy: 0, dScale: (primaryDelta + secondaryDelta) / 2 / 150 });
      } else {
        setCamDragOffset({
          dx: (e.clientX - camDrag.startX) / (viewport.zoom || 1),
          dy: (e.clientY - camDrag.startY) / (viewport.zoom || 1),
          dScale: 0,
        });
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (!camDragRef.current) return;
      const camDrag = camDragRef.current;
      if (camDrag.handle) {
        const dx = e.clientX - camDrag.startX;
        const dy = e.clientY - camDrag.startY;
        const corner = camDrag.handle.replace('resize-', '');
        const isRight = corner.includes('e');
        const isBottom = corner.includes('s');
        const primaryDelta = isRight ? dx : -dx;
        const secondaryDelta = isBottom ? dy : -dy;
        const dScale = (primaryDelta + secondaryDelta) / 2 / 150;
        if (Math.abs(dScale) > 0.01) {
          onResizeRef.current(CAMERA_FRAME_TARGET_ID, dScale, dScale);
        }
      } else {
        const dx = (e.clientX - camDrag.startX) / (viewport.zoom || 1);
        const dy = (e.clientY - camDrag.startY) / (viewport.zoom || 1);
        if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
          onDragRef.current(CAMERA_FRAME_TARGET_ID, dx, dy);
        }
      }
      camDragRef.current = null;
      setCamDragOffset(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [viewport.zoom]);

  // ── Compute initial data ───────────────────────────────────────

  const initialData = scene
    ? {
        elements: applyAnimationToElements(
          getNonDeletedElements(scene.elements as ExcalidrawElement[]) as NonDeletedExcalidrawElement[],
          frameState,
          targets,
        ) as ExcalidrawElement[],
        appState: {
          ...scene.appState,
          selectedElementIds: Object.fromEntries(selectedElementIds.map(id => [id, true])),
        },
        files: scene.files,
      }
    : undefined;

  if (!scene) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        No scene loaded
      </div>
    );
  }

  // ── Camera frame overlay positioning ─────────────────────────────

  const camState = frameState.get(CAMERA_FRAME_TARGET_ID);
  const camTx = (camState?.translateX ?? 0) + (camDragOffset?.dx ?? 0);
  const camTy = (camState?.translateY ?? 0) + (camDragOffset?.dy ?? 0);
  const camSx = (camState?.scaleX ?? 1) + (camDragOffset?.dScale ?? 0);
  const camSy = (camState?.scaleY ?? 1) + (camDragOffset?.dScale ?? 0);

  const camW = cameraFrame.width * camSx;
  const camH = getFrameHeight(cameraFrame) * camSy;
  const camCX = cameraFrame.x + camTx;
  const camCY = cameraFrame.y + camTy;

  // Convert scene coords → screen coords using Excalidraw's viewport
  // Excalidraw formula: screenX = (sceneX + scrollX) * zoom
  const { scrollX, scrollY, zoom } = viewport;
  const screenCX = (camCX + scrollX) * zoom;
  const screenCY = (camCY + scrollY) * zoom;
  const screenW = camW * zoom;
  const screenH = camH * zoom;

  const frameLeft = screenCX - screenW / 2;
  const frameTop = screenCY - screenH / 2;
  const isFrameSelected = selectedElementIds.includes(CAMERA_FRAME_TARGET_ID);

  return (
    <div ref={containerRef} className="excalidraw-wrapper" style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Excalidraw
        excalidrawAPI={handleApiReady}
        initialData={initialData}
        onChange={handleChange}
        theme="light"
      />

      {/* Camera frame overlay */}
      <div className="absolute inset-0 pointer-events-none" style={{ overflow: 'hidden', zIndex: 10 }}>
        {/* Dimmed area outside frame */}
        <div
          className="absolute inset-0"
          style={{
            background: 'rgba(0, 0, 0, 0.15)',
            clipPath: `polygon(
              0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%,
              ${frameLeft}px ${frameTop}px,
              ${frameLeft}px ${frameTop + screenH}px,
              ${frameLeft + screenW}px ${frameTop + screenH}px,
              ${frameLeft + screenW}px ${frameTop}px,
              ${frameLeft}px ${frameTop}px
            )`,
          }}
        />
        {/* Frame border */}
        <div
          style={{
            position: 'absolute',
            left: frameLeft,
            top: frameTop,
            width: screenW,
            height: screenH,
            border: `2px solid ${isFrameSelected ? '#ef4444' : '#dc2626'}`,
            borderRadius: 2,
          }}
        >
          <span
            className="absolute text-white text-[10px] px-1 rounded-sm"
            style={{ top: -18, left: 0, background: 'rgba(0,0,0,0.5)' }}
          >
            🎬 {cameraFrame.aspectRatio}
          </span>
        </div>

        {/* Edge drag areas (for moving camera frame) */}
        {(() => {
          const B = 6; // border hit area width
          const edges = [
            { left: frameLeft - B, top: frameTop - B, width: screenW + B * 2, height: B * 2 },
            { left: frameLeft - B, top: frameTop + screenH - B, width: screenW + B * 2, height: B * 2 },
            { left: frameLeft - B, top: frameTop + B, width: B * 2, height: screenH - B * 2 },
            { left: frameLeft + screenW - B, top: frameTop + B, width: B * 2, height: screenH - B * 2 },
          ];
          return edges.map((style, i) => (
            <div
              key={`edge-${i}`}
              className="pointer-events-auto cursor-move"
              style={{ position: 'absolute', ...style }}
              onMouseDown={(e) => {
                e.stopPropagation();
                handleCameraMouseDown(e);
              }}
            />
          ));
        })()}

        {/* Corner resize handles (only when selected) */}
        {isFrameSelected &&
          (['nw', 'ne', 'sw', 'se'] as const).map((corner) => {
            const isRight = corner.includes('e');
            const isBottom = corner.includes('s');
            return (
              <div
                key={corner}
                className="pointer-events-auto absolute w-2.5 h-2.5 bg-white border-2 border-red-500 rounded-sm"
                style={{
                  left: isRight ? frameLeft + screenW - 5 : frameLeft - 5,
                  top: isBottom ? frameTop + screenH - 5 : frameTop - 5,
                  cursor: corner === 'nw' || corner === 'se' ? 'nwse-resize' : 'nesw-resize',
                }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  handleCameraMouseDown(e, `resize-${corner}`);
                }}
              />
            );
          })}
      </div>
    </div>
  );
}

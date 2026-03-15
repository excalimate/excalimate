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

import { useCallback, useRef, useEffect, useMemo, useState } from 'react';
import type React from 'react';
import { Excalidraw, getNonDeletedElements } from '@excalidraw/excalidraw';
import '@excalidraw/excalidraw/index.css';
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types';
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types';
import type { ExcalidrawSceneData } from '../../types/excalidraw';
import type { FrameState } from '../../types/animation';
import type { AnimatableTarget } from '../../types/excalidraw';
import type { CameraFrame } from '../../stores/projectStore';
import { CAMERA_FRAME_TARGET_ID, useProjectStore } from '../../stores/projectStore';
import { useUndoRedoStore } from '../../stores/undoRedoStore';
import { CameraFrameOverlay } from './CameraFrameOverlay';
import { computeCameraOverlayPosition } from './cameraOverlayMath';
import { useExcalidrawAnimationSync } from './useExcalidrawAnimationSync';
import { useExcalidrawChangeBridge } from './useExcalidrawChangeBridge';

export interface ExcalidrawAnimateEditorProps {
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

export interface AnimateEditorRefs {
  apiRef: React.RefObject<ExcalidrawImperativeAPI | null>;
  programmaticVersionRef: React.MutableRefObject<number>;
  lastProcessedVersionRef: React.MutableRefObject<number>;
  lastAnimatedRef: React.MutableRefObject<Map<string, { x: number; y: number; width: number; height: number }>>;
  lastElementOrderRef: React.MutableRefObject<string>;
  initialRenderDoneRef: React.MutableRefObject<boolean>;
  sceneRef: React.MutableRefObject<ExcalidrawSceneData | null>;
  targetsRef: React.MutableRefObject<AnimatableTarget[]>;
  frameStateRef: React.MutableRefObject<FrameState>;
  onSelectRef: React.MutableRefObject<(ids: string[]) => void>;
  onDragRef: React.MutableRefObject<(targetId: string, dx: number, dy: number) => void>;
  onResizeRef: React.MutableRefObject<(targetId: string, dsx: number, dsy: number) => void>;
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
  // Monotonic version token for deterministic self-change suppression.
  // Incremented before every programmatic api.updateScene() call.
  // In onChange, we compare with the version we last saw — if it changed
  // since we last processed a user edit, the onChange is from our own
  // updateScene and should be ignored. This replaces the fragile
  // Date.now()+100ms timestamp window which was a race condition.
  const programmaticVersionRef = useRef(0);
  const lastProcessedVersionRef = useRef(0);
  const lastAnimatedRef = useRef<Map<string, { x: number; y: number; width: number; height: number }>>(new Map());
  const lastElementOrderRef = useRef<string>('');
  const [viewport, setViewport] = useState({ scrollX: 0, scrollY: 0, zoom: 1, width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  // Track whether we've done the initial render (skip first updateScene since
  // initialData already rendered elements correctly on the canvas).
  const initialRenderDoneRef = useRef(false);

  // Compute a key from the set of element IDs.  When elements are
  // added/removed (MCP structural change), the key changes and the inner
  // Excalidraw component remounts with fresh initialData — this is the
  // only reliable way to make Excalidraw v0.18 render a new scene.
  // During animation playback (same IDs, different properties) the key
  // stays the same so api.updateScene() handles property changes cheaply.
  const sceneKey = scene
    ? scene.elements
        .filter((el: { isDeleted?: boolean }) => !el.isDeleted)
        .map((el: { id: string }) => el.id)
        .join(',')
    : 'empty';

  // Track the sceneKey that the current Excalidraw instance was initialized with.
  // When it changes, Excalidraw remounts (via key={sceneKey}) and we need to
  // wait for handleApiReady before calling updateScene again.
  const [readyForKey, setReadyForKey] = useState<string | null>(null);
  const ready = readyForKey === sceneKey;

  // Reset refs when Excalidraw remounts (sceneKey changed)
  const prevKeyRef = useRef(sceneKey);
  useEffect(() => {
    if (sceneKey !== prevKeyRef.current) {
      prevKeyRef.current = sceneKey;
      apiRef.current = null;
      lastElementOrderRef.current = '';
      programmaticVersionRef.current = 0;
      lastProcessedVersionRef.current = 0;
      initialRenderDoneRef.current = false;
    }
  }, [sceneKey]);

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

  const refs = useMemo<AnimateEditorRefs>(() => ({
    apiRef,
    programmaticVersionRef,
    lastProcessedVersionRef,
    lastAnimatedRef,
    lastElementOrderRef,
    initialRenderDoneRef,
    sceneRef,
    targetsRef,
    frameStateRef,
    onSelectRef,
    onDragRef,
    onResizeRef,
  }), []);

  // ── API Ready ──────────────────────────────────────────────────

  const handleApiReady = useCallback((api: ExcalidrawImperativeAPI) => {
    apiRef.current = api;

    // After Excalidraw mounts and processes initialData, read back the
    // normalized elements. Excalidraw adds internal properties (index,
    // frameId, etc.) that are required for api.updateScene() to work
    // correctly for canvas rendering. Without this, elements from
    // external sources (e.g. MCP server) that lack these properties
    // will be accepted by updateScene() but not painted on the canvas.
    const normalizedElements = api.getSceneElements();
    if (normalizedElements.length > 0) {
      const currentScene = sceneRef.current;
      if (currentScene) {
        useProjectStore.getState().updateScene({
          ...currentScene,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          elements: [...normalizedElements] as any,
        });
      }
    }

    setReadyForKey(sceneKey);
  }, [sceneKey]);

  useExcalidrawAnimationSync({
    ready,
    scene,
    frameState,
    targets,
    selectedElementIds,
    refs,
  });

  const handleChange = useExcalidrawChangeBridge({
    refs,
    setViewport,
  });

  // ── Camera frame drag/resize ──────────────────────────────────

  const camDragRef = useRef<{ startX: number; startY: number; handle?: string } | null>(null);
  const [camDragOffset, setCamDragOffset] = useState<{ dx: number; dy: number; dScale: number } | null>(null);

  const handleCameraMouseDown = useCallback((e: React.MouseEvent, handle?: string) => {
    e.stopPropagation();
    useUndoRedoStore.getState().beginBatch();
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
      useUndoRedoStore.getState().endBatch();
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [viewport]);

  // ── Compute initial data ───────────────────────────────────────
  // IMPORTANT: Pass raw scene elements (not animation-transformed) as initialData.
  // Animation transforms are applied via api.updateScene() in the useEffect.
  // If we pass animated elements here (e.g. opacity 0 at time 0), Excalidraw
  // may re-apply initialData on internal re-renders, overriding the
  // api.updateScene() call that set opacity to the correct animated value.

  const initialData = scene
    ? {
        elements: getNonDeletedElements(scene.elements as ExcalidrawElement[]),
        appState: {
          ...scene.appState,
          // Preserve the user's viewport across Excalidraw remounts
          ...(viewport.width > 0 ? {
            scrollX: viewport.scrollX,
            scrollY: viewport.scrollY,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            zoom: { value: viewport.zoom } as any,
          } : {}),
          selectedElementIds: Object.fromEntries(selectedElementIds.map(id => [id, true as const])),
        },
        files: scene.files,
      }
    : undefined;

  // Batch undo entries during Excalidraw element drags. pointerdown starts
  // the batch, pointerup ends it — so an entire drag produces one undo entry.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handlePointerDown = () => {
      useUndoRedoStore.getState().beginBatch();
    };
    const handlePointerUp = () => {
      useUndoRedoStore.getState().endBatch();
    };

    container.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      container.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, []);

  if (!scene) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        No scene loaded
      </div>
    );
  }

  const overlayPosition = computeCameraOverlayPosition(cameraFrame, frameState, camDragOffset, viewport);
  const isFrameSelected = selectedElementIds.includes(CAMERA_FRAME_TARGET_ID);

  return (
    <div ref={containerRef} className="excalidraw-wrapper" style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Excalidraw
        key={sceneKey}
        excalidrawAPI={handleApiReady}
        initialData={initialData}
        onChange={handleChange}
        theme="light"
      />

      <CameraFrameOverlay
        position={overlayPosition}
        isSelected={isFrameSelected}
        onMouseDown={handleCameraMouseDown}
        aspectRatio={cameraFrame.aspectRatio}
      />
    </div>
  );
}
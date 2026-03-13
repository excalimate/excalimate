/**
 * AnimationCanvas — Main animation preview component.
 *
 * Replaces the old AnimationPreview.tsx with a clean canvas-only architecture:
 * 1. Scene canvas: Excalidraw exportToCanvas for high-quality rendering
 * 2. Interaction overlay: HTML/CSS handles, selection rects, camera frame
 * 3. No SVG layer: all hit-testing is mathematical
 *
 * The component uses:
 * - SceneRenderer for cached canvas rendering
 * - InteractionManager for mouse event state machine
 * - InteractionOverlay for selection UI
 */

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import type { ExcalidrawSceneData, AnimatableTarget } from '../../types/excalidraw';
import type { FrameState, ElementAnimationState } from '../../types/animation';
import type { CameraFrame } from '../../stores/projectStore';
import { CAMERA_FRAME_TARGET_ID } from '../../stores/projectStore';
import { useUIStore } from '../../stores/uiStore';
import { useUndoRedoStore } from '../../stores/undoRedoStore';
import { SceneRenderer } from '../../core/renderer/SceneRenderer';
import type { TransientState } from '../../core/renderer/SceneRenderer';
import { InteractionManager } from '../../core/renderer/InteractionManager';
import type { InteractionCallbacks } from '../../core/renderer/InteractionManager';
import type { ViewportState } from '../../core/renderer/ViewportTransform';
import { InteractionOverlay } from './InteractionOverlay';

interface AnimationCanvasProps {
  scene: ExcalidrawSceneData | null;
  targets: AnimatableTarget[];
  frameState: FrameState;
  currentTime: number;
  selectedElementIds: string[];
  cameraFrame: CameraFrame;
  onSelectElements: (ids: string[]) => void;
  onDragElement: (targetId: string, deltaX: number, deltaY: number) => void;
  onResizeElement: (targetId: string, dScaleX: number, dScaleY: number) => void;
  className?: string;
}

export function AnimationCanvas({
  scene,
  targets,
  frameState,
  selectedElementIds,
  cameraFrame,
  onSelectElements,
  onDragElement,
  onResizeElement,
  className = '',
}: AnimationCanvasProps) {
  // ── Refs ─────────────────────────────────────────────────────────
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<SceneRenderer>(new SceneRenderer());
  const interactionRef = useRef<InteractionManager | null>(null);

  // ── State ────────────────────────────────────────────────────────
  const [viewport, setViewport] = useState<ViewportState>({ panX: 0, panY: 0, zoom: 1 });
  const [transientState, setTransientState] = useState<TransientState | null>(null);
  const [renderTick, setRenderTick] = useState(0);
  // Canvas offset as ref — updated synchronously with canvas draw to avoid jitter
  const canvasOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // ── Panning refs ─────────────────────────────────────────────────
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  // ── Camera drag state ────────────────────────────────────────────
  const [camDragOffset, setCamDragOffset] = useState<{ dx: number; dy: number; dScale: number } | null>(null);
  const camDragRef = useRef<{ startX: number; startY: number; handle?: string } | null>(null);

  // ── Interaction callbacks (stable refs) ──────────────────────────
  const onSelectRef = useRef(onSelectElements);
  const onDragRef = useRef(onDragElement);
  const onResizeRef = useRef(onResizeElement);
  useEffect(() => { onSelectRef.current = onSelectElements; }, [onSelectElements]);
  useEffect(() => { onDragRef.current = onDragElement; }, [onDragElement]);
  useEffect(() => { onResizeRef.current = onResizeElement; }, [onResizeElement]);

  // ── Initialize interaction manager ───────────────────────────────
  useEffect(() => {
    const callbacks: InteractionCallbacks = {
      onSelectionChange: (ids) => onSelectRef.current(ids),
      onDragCommit: (targetId, dx, dy) => onDragRef.current(targetId, dx, dy),
      onResizeCommit: (targetId, dSx, dSy) => onResizeRef.current(targetId, dSx, dSy),
      onTransientStateChange: (state) => setTransientState(state),
      onViewportChange: (state) => setViewport(state),
      onRequestRender: () => setRenderTick(n => n + 1),
      onPushUndoState: () => useUndoRedoStore.getState().pushState(),
    };

    interactionRef.current = new InteractionManager(callbacks);

    return () => {
      interactionRef.current?.destroy();
      interactionRef.current = null;
    };
  }, []);

  // ── Sync external state to interaction manager ───────────────────
  useEffect(() => {
    const im = interactionRef.current;
    if (!im) return;
    im.updateTargets(targets);
    im.updateFrameState(frameState);
    im.updateSelectedIds(selectedElementIds);
    im.updateViewport(viewport);
    if (containerRef.current) {
      im.updateContainerRect(containerRef.current.getBoundingClientRect());
    }
  }, [targets, frameState, selectedElementIds, viewport]);

  // Update container rect on resize
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => {
      interactionRef.current?.updateContainerRect(container.getBoundingClientRect());
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // ── Compute effective frame state (with transient + camera drag) ─

  const effectiveFrameState = useMemo<FrameState>(() => {
    let fs = frameState;

    // Merge transient state for interactive elements
    if (transientState) {
      fs = mergeTransientIntoFrameState(fs, transientState);
    }

    // Merge camera drag offset
    if (camDragOffset) {
      const merged = new Map(fs);
      const camState = merged.get(CAMERA_FRAME_TARGET_ID) ?? {
        targetId: CAMERA_FRAME_TARGET_ID,
        opacity: 1, translateX: 0, translateY: 0,
        scaleX: 1, scaleY: 1, rotation: 0, drawProgress: 1,
      };
      merged.set(CAMERA_FRAME_TARGET_ID, {
        ...camState,
        translateX: camState.translateX + camDragOffset.dx,
        translateY: camState.translateY + camDragOffset.dy,
        scaleX: camState.scaleX + camDragOffset.dScale,
        scaleY: camState.scaleY + camDragOffset.dScale,
      });
      fs = merged;
    }

    return fs;
  }, [frameState, transientState, camDragOffset]);

  // ── Render scene to canvas ───────────────────────────────────────

  const ghostMode = useUIStore(s => s.ghostMode);

  useEffect(() => {
    if (!scene || !canvasRef.current) return;

    let cancelled = false;
    const renderer = rendererRef.current;

    const doRender = async () => {
      const result = await renderer.render(
        scene, frameState, targets, transientState, ghostMode,
      );

      if (cancelled || !result || !canvasRef.current) return;

      const canvas = canvasRef.current;
      const srcCanvas = result.canvas;

      if (canvas.width !== srcCanvas.width || canvas.height !== srcCanvas.height) {
        canvas.width = srcCanvas.width;
        canvas.height = srcCanvas.height;
      }

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(srcCanvas, 0, 0);
      }

      // Update canvas position synchronously with the draw (via DOM, not React state)
      // to avoid one-frame jitter when edge elements change the scene bounds.
      const padding = 30;
      const newOffset = {
        x: result.bounds.minX - padding,
        y: result.bounds.minY - padding,
      };
      canvasOffsetRef.current = newOffset;
      canvas.style.left = `${newOffset.x}px`;
      canvas.style.top = `${newOffset.y}px`;
    };

    const rafId = requestAnimationFrame(() => { doRender(); });
    return () => { cancelled = true; cancelAnimationFrame(rafId); };
  }, [scene, frameState, targets, transientState, ghostMode, renderTick]);

  // Ghost mode re-render
  useEffect(() => {
    return useUIStore.subscribe((s, prev) => {
      if (s.ghostMode !== prev.ghostMode) setRenderTick(n => n + 1);
    });
  }, []);

  // ── Mouse event handlers ─────────────────────────────────────────

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1) {
      e.preventDefault();
      isPanningRef.current = true;
      panStartRef.current = { x: e.clientX, y: e.clientY, panX: viewport.panX, panY: viewport.panY };
      return;
    }
    if (e.button !== 0) return;
    e.preventDefault();
    interactionRef.current?.handleMouseDown(e.nativeEvent);
  }, [viewport.panX, viewport.panY]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    interactionRef.current?.handleDoubleClick(e.nativeEvent);
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    interactionRef.current?.handleWheel(e.nativeEvent);
  }, []);

  // Global mouse move / up
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isPanningRef.current) {
        const dx = e.clientX - panStartRef.current.x;
        const dy = e.clientY - panStartRef.current.y;
        setViewport(v => ({
          ...v,
          panX: panStartRef.current.panX + dx,
          panY: panStartRef.current.panY + dy,
        }));
        return;
      }

      if (camDragRef.current) {
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
          const dx = (e.clientX - camDrag.startX) / viewport.zoom;
          const dy = (e.clientY - camDrag.startY) / viewport.zoom;
          setCamDragOffset({ dx, dy, dScale: 0 });
        }
        return;
      }

      interactionRef.current?.handleMouseMove(e);
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (isPanningRef.current) {
        isPanningRef.current = false;
        return;
      }

      if (camDragRef.current) {
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
          const dx = (e.clientX - camDrag.startX) / viewport.zoom;
          const dy = (e.clientY - camDrag.startY) / viewport.zoom;
          if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
            onDragRef.current(CAMERA_FRAME_TARGET_ID, dx, dy);
          }
        }
        camDragRef.current = null;
        setCamDragOffset(null);
        return;
      }

      interactionRef.current?.handleMouseUp(e);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [viewport.zoom]);

  // ── Camera frame mouse down ──────────────────────────────────────

  const handleCameraMouseDown = useCallback((e: React.MouseEvent, handle?: string) => {
    e.stopPropagation();
    useUndoRedoStore.getState().pushState();
    camDragRef.current = { startX: e.clientX, startY: e.clientY, handle };
    if (!selectedElementIds.includes(CAMERA_FRAME_TARGET_ID)) {
      onSelectElements([CAMERA_FRAME_TARGET_ID]);
    }
  }, [selectedElementIds, onSelectElements]);

  // ── Render ───────────────────────────────────────────────────────

  const marquee = interactionRef.current?.marquee ?? null;

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden bg-white select-none ${className}`}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      onWheel={handleWheel}
    >
      {/* Viewport-transformed layer — scene coordinates inside this div */}
      <div
        className="absolute pointer-events-none"
        style={{
          transformOrigin: '0 0',
          transform: `translate(${viewport.panX}px, ${viewport.panY}px) scale(${viewport.zoom})`,
          willChange: 'transform',
        }}
      >
        {/* Scene canvas — position updated via DOM ref in render effect */}
        <canvas
          ref={canvasRef}
          className="absolute"
          style={{
            left: canvasOffsetRef.current.x,
            top: canvasOffsetRef.current.y,
          }}
        />
      </div>

      {/* Interaction overlay — screen space */}
      <InteractionOverlay
        targets={targets}
        selectedIds={selectedElementIds}
        frameState={effectiveFrameState}
        viewport={viewport}
        cameraFrame={cameraFrame}
        marquee={marquee}
        onCameraMouseDown={handleCameraMouseDown}
      />
    </div>
  );
}

// ── Utility ────────────────────────────────────────────────────────

function mergeTransientIntoFrameState(
  frameState: FrameState,
  transient: TransientState,
): FrameState {
  const merged = new Map(frameState);
  for (const targetId of transient.activeTargetIds) {
    const existing = merged.get(targetId) ?? {
      targetId,
      opacity: 1, translateX: 0, translateY: 0,
      scaleX: 1, scaleY: 1, rotation: 0, drawProgress: 1,
    };
    const updated: ElementAnimationState = { ...existing };
    if (transient.dragDelta) {
      updated.translateX += transient.dragDelta.dx;
      updated.translateY += transient.dragDelta.dy;
    }
    if (transient.resizeScale) {
      updated.scaleX = Math.max(0.05, updated.scaleX + transient.resizeScale.dSx);
      updated.scaleY = Math.max(0.05, updated.scaleY + transient.resizeScale.dSy);
    }
    if (transient.rotationDelta !== undefined) {
      updated.rotation += transient.rotationDelta;
    }
    merged.set(targetId, updated);
  }
  return merged;
}

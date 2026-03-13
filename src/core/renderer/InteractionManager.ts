/**
 * InteractionManager — Mouse event state machine for the animation canvas.
 *
 * Processes mouse events and produces:
 * 1. TransientState updates (for live drag/resize feedback)
 * 2. Committed state changes (on mouseup → animation store)
 * 3. Selection changes
 * 4. Viewport changes (pan/zoom)
 *
 * This is a pure logic module — no DOM manipulation, no React state.
 * The React component reads outputs and applies them.
 */

import type { AnimatableTarget, Bounds } from '../../types/excalidraw';
import type { FrameState } from '../../types/animation';
import type { TransientState } from './SceneRenderer';
import type { Point, ViewportState } from './ViewportTransform';
import type { HandleDirection } from './TransformHandles';
import {
  elementAtPoint,
  elementsInRect,
  findTopmostGroup,
  drillDown,
} from './HitTesting';
import {
  getTransformHandles,
  hitTestHandle,
  computeResizeDeltas,
  computeRotationDelta,
} from './TransformHandles';
import { getAnimatedOrientedRect, getTargetAnimatedBounds } from './ElementBounds';
import { CAMERA_FRAME_TARGET_ID } from '../../stores/projectStore';

const DRAG_THRESHOLD = 3; // pixels

export type InteractionState =
  | 'idle'
  | 'pending'      // mousedown, waiting for threshold
  | 'dragging'
  | 'resizing'
  | 'rotating'
  | 'marquee'
  | 'panning';

export interface InteractionCallbacks {
  onSelectionChange: (ids: string[]) => void;
  onDragCommit: (targetId: string, dx: number, dy: number) => void;
  onResizeCommit: (targetId: string, dSx: number, dSy: number) => void;
  onTransientStateChange: (state: TransientState | null) => void;
  onViewportChange: (state: ViewportState) => void;
  onRequestRender: () => void;
  onPushUndoState: () => void;
}

interface PendingGesture {
  startScreenX: number;
  startScreenY: number;
  elementId: string | null;
  shiftKey: boolean;
  ctrlKey: boolean;
}

interface ActiveDrag {
  targetIds: string[];
  startScreenX: number;
  startScreenY: number;
}

interface ActiveResize {
  targetId: string;
  handle: HandleDirection;
  startScreenX: number;
  startScreenY: number;
  startWidth: number;
  startHeight: number;
  /** Original element bounds width (before animation scale) for translate compensation */
  originalWidth: number;
  originalHeight: number;
}

interface ActiveRotation {
  targetId: string;
  centerX: number;
  centerY: number;
  startAngle: number;
}

interface ActiveMarquee {
  /** Screen-space coordinates relative to container */
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

interface ActivePan {
  startScreenX: number;
  startScreenY: number;
  startPanX: number;
  startPanY: number;
}

export class InteractionManager {
  private _state: InteractionState = 'idle';
  private _pending: PendingGesture | null = null;
  private _drag: ActiveDrag | null = null;
  private _resize: ActiveResize | null = null;
  private _rotation: ActiveRotation | null = null;
  private _marquee: ActiveMarquee | null = null;
  private _pan: ActivePan | null = null;

  // External state references (updated from React)
  private _targets: AnimatableTarget[] = [];
  private _frameState: FrameState = new Map();
  private _selectedIds: string[] = [];
  private _viewport: ViewportState = { panX: 0, panY: 0, zoom: 1 };
  private _containerRect: DOMRect | null = null;

  private _callbacks: InteractionCallbacks;
  private _suppressClick = false;

  constructor(callbacks: InteractionCallbacks) {
    this._callbacks = callbacks;
  }

  // ── External State Updates ─────────────────────────────────────

  updateTargets(targets: AnimatableTarget[]): void { this._targets = targets; }
  updateFrameState(frameState: FrameState): void { this._frameState = frameState; }
  updateSelectedIds(ids: string[]): void { this._selectedIds = ids; }
  updateViewport(viewport: ViewportState): void { this._viewport = viewport; }
  updateContainerRect(rect: DOMRect): void { this._containerRect = rect; }

  get state(): InteractionState { return this._state; }
  get marquee(): ActiveMarquee | null { return this._marquee; }

  // ── Mouse Event Handlers ───────────────────────────────────────

  handleMouseDown(e: MouseEvent): void {
    // Middle-click: pan
    if (e.button === 1) {
      this._startPan(e);
      return;
    }

    if (e.button !== 0) return;

    this._suppressClick = false;

    // Convert screen position to scene position for hit-testing
    const scenePoint = this._screenToScene(e.clientX, e.clientY);

    if (import.meta.env.DEV) {
      console.debug('[IM] mouseDown', {
        selectedIds: [...this._selectedIds],
        client: { x: e.clientX, y: e.clientY },
        scene: scenePoint,
        targetsCount: this._targets.length,
      });
    }

    // Check if clicking on a resize handle of a selected element
    const handleHit = this._hitTestHandles(e.clientX, e.clientY);
    if (import.meta.env.DEV) {
      console.debug('[IM] handleHit:', handleHit, 'selectedIds:', this._selectedIds);
    }
    if (handleHit) {
      if (import.meta.env.DEV) {
        console.debug('[IM] starting resize:', handleHit.handle, 'on', handleHit.targetId);
      }
      this._startResize(e, handleHit.targetId, handleHit.handle);
      return;
    }

    // Hit-test elements
    const hitElementId = elementAtPoint(
      scenePoint.x, scenePoint.y,
      this._targets, this._frameState,
    );

    if (import.meta.env.DEV) {
      console.debug('[IM] hitTest result:', hitElementId);
    }

    this._pending = {
      startScreenX: e.clientX,
      startScreenY: e.clientY,
      elementId: hitElementId,
      shiftKey: e.shiftKey,
      ctrlKey: e.ctrlKey || e.metaKey,
    };
    this._state = 'pending';
  }

  handleMouseMove(e: MouseEvent): void {
    // Handle panning
    if (this._state === 'panning' && this._pan) {
      const dx = e.clientX - this._pan.startScreenX;
      const dy = e.clientY - this._pan.startScreenY;
      this._callbacks.onViewportChange({
        ...this._viewport,
        panX: this._pan.startPanX + dx,
        panY: this._pan.startPanY + dy,
      });
      return;
    }

    // Handle pending gesture (check threshold)
    if (this._state === 'pending' && this._pending) {
      const dx = e.clientX - this._pending.startScreenX;
      const dy = e.clientY - this._pending.startScreenY;

      if (Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) return;

      if (this._pending.elementId) {
        this._startDrag(this._pending);
      } else {
        this._startMarquee(this._pending);
      }
      this._pending = null;
    }

    // Handle active drag
    if (this._state === 'dragging' && this._drag) {
      const dx = (e.clientX - this._drag.startScreenX) / this._viewport.zoom;
      const dy = (e.clientY - this._drag.startScreenY) / this._viewport.zoom;

      // Check if dragging camera frame
      const isCameraDrag = this._drag.targetIds.includes(CAMERA_FRAME_TARGET_ID);

      this._callbacks.onTransientStateChange({
        activeTargetIds: this._drag.targetIds,
        dragDelta: { dx, dy },
      });

      if (!isCameraDrag) {
        this._callbacks.onRequestRender();
      }
    }

    // Handle active resize
    if (this._state === 'resizing' && this._resize) {
      const sceneDx = (e.clientX - this._resize.startScreenX) / this._viewport.zoom;
      const sceneDy = (e.clientY - this._resize.startScreenY) / this._viewport.zoom;

      const { dSx, dSy } = computeResizeDeltas(
        this._resize.handle,
        sceneDx, sceneDy,
        this._resize.startWidth,
        this._resize.startHeight,
        e.shiftKey,
        e.altKey,
      );

      // Compute translate compensation to keep anchor fixed
      let dragDelta: { dx: number; dy: number } | undefined;
      if (e.altKey && this._resize) {
        // Alt = center anchor: compensate half width/height change
        dragDelta = {
          dx: -this._resize.originalWidth * dSx / 2,
          dy: -this._resize.originalHeight * dSy / 2,
        };
      } else {
        dragDelta = this._computeResizeTranslate(dSx, dSy);
      }

      this._callbacks.onTransientStateChange({
        activeTargetIds: [this._resize.targetId],
        resizeScale: { dSx, dSy },
        dragDelta,
      });

      this._callbacks.onRequestRender();
    }

    // Handle active rotation
    if (this._state === 'rotating' && this._rotation) {
      const scenePoint = this._screenToScene(e.clientX, e.clientY);
      const delta = computeRotationDelta(
        scenePoint.x, scenePoint.y,
        this._rotation.centerX, this._rotation.centerY,
        this._rotation.startAngle,
      );

      this._callbacks.onTransientStateChange({
        activeTargetIds: [this._rotation.targetId],
        rotationDelta: delta,
      });

      this._callbacks.onRequestRender();
    }

    // Handle active marquee
    if (this._state === 'marquee' && this._marquee) {
      if (this._containerRect) {
        this._marquee = {
          ...this._marquee,
          currentX: e.clientX - this._containerRect.left,
          currentY: e.clientY - this._containerRect.top,
        };
      }
      this._callbacks.onRequestRender();
    }
  }

  handleMouseUp(e: MouseEvent): void {
    // End pan
    if (this._state === 'panning') {
      this._pan = null;
      this._state = 'idle';
      return;
    }

    // Commit drag
    if (this._state === 'dragging' && this._drag) {
      const dx = (e.clientX - this._drag.startScreenX) / this._viewport.zoom;
      const dy = (e.clientY - this._drag.startScreenY) / this._viewport.zoom;

      if (Math.abs(dx) > DRAG_THRESHOLD / this._viewport.zoom ||
          Math.abs(dy) > DRAG_THRESHOLD / this._viewport.zoom) {
        for (const targetId of this._drag.targetIds) {
          this._callbacks.onDragCommit(targetId, dx, dy);
        }
      }

      this._drag = null;
      this._state = 'idle';
      this._callbacks.onTransientStateChange(null);
      this._suppressClick = true;
      return;
    }

    // Commit resize
    if (this._state === 'resizing' && this._resize) {
      const sceneDx = (e.clientX - this._resize.startScreenX) / this._viewport.zoom;
      const sceneDy = (e.clientY - this._resize.startScreenY) / this._viewport.zoom;

      const { dSx, dSy } = computeResizeDeltas(
        this._resize.handle,
        sceneDx, sceneDy,
        this._resize.startWidth,
        this._resize.startHeight,
        e.shiftKey,
        e.altKey,
      );

      if (Math.abs(dSx) > 0.01 || Math.abs(dSy) > 0.01) {
        // Commit translate compensation (keeps anchor fixed)
        let translate: { dx: number; dy: number } | undefined;
        if (e.altKey) {
          // Center anchor: compensate half growth
          translate = {
            dx: -this._resize.originalWidth * dSx / 2,
            dy: -this._resize.originalHeight * dSy / 2,
          };
        } else {
          translate = this._computeResizeTranslate(dSx, dSy);
        }
        if (translate && (Math.abs(translate.dx) > 0.5 || Math.abs(translate.dy) > 0.5)) {
          this._callbacks.onDragCommit(this._resize.targetId, translate.dx, translate.dy);
        }
        this._callbacks.onResizeCommit(this._resize.targetId, dSx, dSy);
      }

      this._resize = null;
      this._state = 'idle';
      this._callbacks.onTransientStateChange(null);
      this._suppressClick = true;
      return;
    }

    // Commit rotation
    if (this._state === 'rotating' && this._rotation) {
      // TODO: Implement rotation commit when rotation animation is added
      this._rotation = null;
      this._state = 'idle';
      this._callbacks.onTransientStateChange(null);
      this._suppressClick = true;
      return;
    }

    // Commit marquee selection
    if (this._state === 'marquee' && this._marquee) {
      this._commitMarquee();
      this._marquee = null;
      this._state = 'idle';
      return;
    }

    // Pending → click (didn't exceed threshold)
    if (this._state === 'pending' && this._pending) {
      if (import.meta.env.DEV) {
        console.debug('[IM] click on:', this._pending.elementId);
      }
      this._handleClick(this._pending);
      this._pending = null;
      this._state = 'idle';
      return;
    }

    this._state = 'idle';
  }

  handleDoubleClick(e: MouseEvent): void {
    const scenePoint = this._screenToScene(e.clientX, e.clientY);
    const hitElementId = elementAtPoint(
      scenePoint.x, scenePoint.y,
      this._targets, this._frameState,
    );

    if (!hitElementId) return;

    const currentSelection = this._selectedIds[0];
    if (currentSelection) {
      this._callbacks.onSelectionChange([
        drillDown(currentSelection, hitElementId, this._targets),
      ]);
    } else {
      this._callbacks.onSelectionChange([hitElementId]);
    }
  }

  handleWheel(e: WheelEvent): void {
    if (!this._containerRect) return;
    const screenPoint: Point = {
      x: e.clientX - this._containerRect.left,
      y: e.clientY - this._containerRect.top,
    };

    // Zoom toward cursor
    const direction = e.deltaY > 0 ? 'out' : 'in';
    const factor = direction === 'in' ? 1.08 : 0.92;
    const newZoom = Math.max(0.1, Math.min(10, this._viewport.zoom * factor));
    const scale = newZoom / this._viewport.zoom;

    this._callbacks.onViewportChange({
      zoom: newZoom,
      panX: screenPoint.x - (screenPoint.x - this._viewport.panX) * scale,
      panY: screenPoint.y - (screenPoint.y - this._viewport.panY) * scale,
    });
  }

  // ── Private: Gesture Initiation ────────────────────────────────

  private _startDrag(pending: PendingGesture): void {
    const elementId = pending.elementId!;
    const topId = findTopmostGroup(elementId, this._targets);

    let dragTargets: string[];
    if (pending.shiftKey) {
      dragTargets = this._selectedIds.includes(topId)
        ? [...this._selectedIds]
        : [...this._selectedIds, topId];
      if (!this._selectedIds.includes(topId)) {
        this._callbacks.onSelectionChange(dragTargets);
      }
    } else if (this._selectedIds.includes(topId)) {
      dragTargets = [...this._selectedIds];
    } else {
      dragTargets = [topId];
      this._callbacks.onSelectionChange(dragTargets);
    }

    this._callbacks.onPushUndoState();

    this._drag = {
      targetIds: dragTargets,
      startScreenX: pending.startScreenX,
      startScreenY: pending.startScreenY,
    };
    this._state = 'dragging';
  }

  private _startResize(e: MouseEvent, targetId: string, handle: HandleDirection): void {
    if (handle === 'rotation') {
      this._startRotation(e, targetId);
      return;
    }

    this._callbacks.onPushUndoState();

    const target = this._targets.find(t => t.id === targetId);
    if (!target) return;

    const bounds = getTargetAnimatedBounds(target, this._frameState, this._targets);

    this._resize = {
      targetId,
      handle,
      startScreenX: e.clientX,
      startScreenY: e.clientY,
      startWidth: bounds.width,
      startHeight: bounds.height,
      originalWidth: target.originalBounds.width,
      originalHeight: target.originalBounds.height,
    };
    this._state = 'resizing';
  }

  private _startRotation(e: MouseEvent, targetId: string): void {
    this._callbacks.onPushUndoState();

    const target = this._targets.find(t => t.id === targetId);
    if (!target) return;

    const oriented = getAnimatedOrientedRect(
      target.originalBounds,
      this._frameState.get(targetId),
      target.rawOrigin,
    );

    const scenePoint = this._screenToScene(e.clientX, e.clientY);
    const startAngle = Math.atan2(
      scenePoint.y - oriented.cy,
      scenePoint.x - oriented.cx,
    );

    this._rotation = {
      targetId,
      centerX: oriented.cx,
      centerY: oriented.cy,
      startAngle,
    };
    this._state = 'rotating';
  }

  private _startMarquee(pending: PendingGesture): void {
    if (!this._containerRect) return;

    const startX = pending.startScreenX - this._containerRect.left;
    const startY = pending.startScreenY - this._containerRect.top;

    this._marquee = {
      startX,
      startY,
      currentX: startX,
      currentY: startY,
    };
    this._state = 'marquee';
  }

  private _startPan(e: MouseEvent): void {
    this._pan = {
      startScreenX: e.clientX,
      startScreenY: e.clientY,
      startPanX: this._viewport.panX,
      startPanY: this._viewport.panY,
    };
    this._state = 'panning';
  }

  // ── Private: Commit & Selection ────────────────────────────────

  /**
   * Compute translate compensation during resize to keep the anchor edge fixed.
   * 
   * Since applyAnimationToElements scales from top-left (x/y stay, width/height change):
   * - East/South handles: top-left is naturally anchored → no translate needed
   * - West handles: right edge should stay → dtx = -originalWidth * dSx
   * - North handles: bottom edge should stay → dty = -originalHeight * dSy
   */
  private _computeResizeTranslate(dSx: number, dSy: number): { dx: number; dy: number } | undefined {
    if (!this._resize) return undefined;

    const handle = this._resize.handle;
    const dx = handle.includes('w') ? -this._resize.originalWidth * dSx : 0;
    const dy = handle.includes('n') ? -this._resize.originalHeight * dSy : 0;

    return { dx, dy };
  }

  private _handleClick(pending: PendingGesture): void {
    if (this._suppressClick) {
      this._suppressClick = false;
      return;
    }

    if (!pending.elementId) {
      // Click on empty space → deselect
      if (!pending.shiftKey && !pending.ctrlKey) {
        this._callbacks.onSelectionChange([]);
      }
      return;
    }

    const topId = findTopmostGroup(pending.elementId, this._targets);

    if (pending.shiftKey) {
      // Add/remove from selection
      const newSelection = this._selectedIds.includes(topId)
        ? this._selectedIds.filter(id => id !== topId)
        : [...this._selectedIds, topId];
      this._callbacks.onSelectionChange(newSelection);
    } else if (pending.ctrlKey) {
      // Toggle in selection
      const newSelection = this._selectedIds.includes(topId)
        ? this._selectedIds.filter(id => id !== topId)
        : [...this._selectedIds, topId];
      this._callbacks.onSelectionChange(newSelection);
    } else {
      // Single select
      this._callbacks.onSelectionChange([topId]);
    }
  }

  private _commitMarquee(): void {
    if (!this._marquee || !this._containerRect) return;

    const m = this._marquee;
    const left = Math.min(m.startX, m.currentX);
    const top = Math.min(m.startY, m.currentY);
    const right = Math.max(m.startX, m.currentX);
    const bottom = Math.max(m.startY, m.currentY);

    // Convert screen rect to scene rect
    const sceneRect: Bounds = {
      x: (left - this._viewport.panX) / this._viewport.zoom,
      y: (top - this._viewport.panY) / this._viewport.zoom,
      width: (right - left) / this._viewport.zoom,
      height: (bottom - top) / this._viewport.zoom,
      centerX: 0,
      centerY: 0,
    };
    sceneRect.centerX = sceneRect.x + sceneRect.width / 2;
    sceneRect.centerY = sceneRect.y + sceneRect.height / 2;

    const hitElements = elementsInRect(sceneRect, this._targets, this._frameState);
    const selectedGroups = [...new Set(
      hitElements.map(id => findTopmostGroup(id, this._targets)),
    )];

    this._callbacks.onSelectionChange(selectedGroups);
  }

  // ── Private: Handle Hit Testing ────────────────────────────────

  private _hitTestHandles(screenX: number, screenY: number): { targetId: string; handle: HandleDirection } | null {
    if (import.meta.env.DEV && this._selectedIds.length > 0) {
      console.debug('[IM] _hitTestHandles called, selectedIds:', [...this._selectedIds]);
    }

    for (const selId of this._selectedIds) {
      if (selId === CAMERA_FRAME_TARGET_ID) continue;

      const target = this._targets.find(t => t.id === selId);
      if (!target) {
        if (import.meta.env.DEV) {
          console.debug('[IM] _hitTestHandles: target NOT FOUND for selId:', selId);
        }
        continue;
      }

      const state = this._frameState.get(selId);
      const oriented = getAnimatedOrientedRect(target.originalBounds, state, target.rawOrigin);
      const totalAngle = target.originalAngle + ((state?.rotation ?? 0) * Math.PI / 180);

      const handles = getTransformHandles(
        oriented,
        totalAngle,
        this._viewport.zoom,
        { x: this._viewport.panX, y: this._viewport.panY },
      );

      // Adjust screen coordinates relative to container
      const adjustedX = this._containerRect
        ? screenX - this._containerRect.left
        : screenX;
      const adjustedY = this._containerRect
        ? screenY - this._containerRect.top
        : screenY;

      if (import.meta.env.DEV) {
        const se = handles.find(h => h.id === 'se');
        console.debug('[IM] _hitTestHandles check', {
          selId: selId.slice(0, 20),
          click: { x: Math.round(adjustedX), y: Math.round(adjustedY) },
          seHandle: se ? { x: Math.round(se.x), y: Math.round(se.y) } : null,
          handleCount: handles.length,
        });
      }

      const hit = hitTestHandle(adjustedX, adjustedY, handles);
      if (hit) return { targetId: selId, handle: hit };
    }

    return null;
  }

  // ── Private: Coordinate Conversion ─────────────────────────────

  private _screenToScene(screenX: number, screenY: number): Point {
    const contX = this._containerRect ? screenX - this._containerRect.left : screenX;
    const contY = this._containerRect ? screenY - this._containerRect.top : screenY;
    return {
      x: (contX - this._viewport.panX) / this._viewport.zoom,
      y: (contY - this._viewport.panY) / this._viewport.zoom,
    };
  }

  // ── Cleanup ────────────────────────────────────────────────────

  destroy(): void {
    this._state = 'idle';
    this._pending = null;
    this._drag = null;
    this._resize = null;
    this._rotation = null;
    this._marquee = null;
    this._pan = null;
  }
}

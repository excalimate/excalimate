/**
 * InteractionOverlay — Pure HTML/CSS overlay for selection UI.
 *
 * Renders selection rectangles, resize handles, marquee selection,
 * and camera frame overlay. All positioned in screen space using
 * mathematical computations (no SVG DOM).
 */

import { memo } from 'react';
import type { AnimatableTarget } from '../../types/excalidraw';
import type { FrameState } from '../../types/animation';
import type { ViewportState } from '../../core/renderer/ViewportTransform';
import type { CameraFrame } from '../../stores/projectStore';
import { CAMERA_FRAME_TARGET_ID, getFrameHeight } from '../../stores/projectStore';
import {
  getAnimatedOrientedRect,
  getTargetAnimatedBounds,
} from '../../core/renderer/ElementBounds';
import {
  getTransformHandles,
} from '../../core/renderer/TransformHandles';

interface MarqueeRect {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

interface InteractionOverlayProps {
  targets: AnimatableTarget[];
  selectedIds: string[];
  frameState: FrameState;
  viewport: ViewportState;
  cameraFrame: CameraFrame;
  marquee: MarqueeRect | null;
  onCameraMouseDown: (e: React.MouseEvent, handle?: string) => void;
}

// ── Camera Frame Overlay ─────────────────────────────────────────

const CameraFrameOverlayInner = memo(function CameraFrameOverlayInner({
  cameraFrame,
  frameState,
  viewport,
  isSelected,
  onMouseDown,
}: {
  cameraFrame: CameraFrame;
  frameState: FrameState;
  viewport: ViewportState;
  isSelected: boolean;
  onMouseDown: (e: React.MouseEvent, handle?: string) => void;
}) {
  const camState = frameState.get(CAMERA_FRAME_TARGET_ID);
  const tx = camState?.translateX ?? 0;
  const ty = camState?.translateY ?? 0;
  const sx = camState?.scaleX ?? 1;
  const sy = camState?.scaleY ?? 1;

  const frameW = cameraFrame.width * sx;
  const frameH = getFrameHeight(cameraFrame) * sy;
  const frameCX = cameraFrame.x + tx;
  const frameCY = cameraFrame.y + ty;

  // Direct scene→screen conversion
  const screenCX = frameCX * viewport.zoom + viewport.panX;
  const screenCY = frameCY * viewport.zoom + viewport.panY;
  const screenW = frameW * viewport.zoom;
  const screenH = frameH * viewport.zoom;

  const borderColor = isSelected ? '#ef4444' : '#dc2626';
  const left = screenCX - screenW / 2;
  const top = screenCY - screenH / 2;
  const BORDER_HIT = 6;

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ overflow: 'hidden' }}>
      {/* Dimmed overlay outside frame */}
      <div
        className="absolute inset-0"
        style={{
          background: 'rgba(0, 0, 0, 0.25)',
          clipPath: `polygon(
            0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%,
            ${left}px ${top}px,
            ${left}px ${top + screenH}px,
            ${left + screenW}px ${top + screenH}px,
            ${left + screenW}px ${top}px,
            ${left}px ${top}px
          )`,
        }}
      />
      {/* Frame border */}
      <div
        style={{
          position: 'absolute',
          left,
          top,
          width: screenW,
          height: screenH,
          border: `2px solid ${borderColor}`,
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
      {/* Edge hit areas for dragging */}
      {[
        { left: left - BORDER_HIT, top: top - BORDER_HIT, width: screenW + BORDER_HIT * 2, height: BORDER_HIT * 2 },
        { left: left - BORDER_HIT, top: top + screenH - BORDER_HIT, width: screenW + BORDER_HIT * 2, height: BORDER_HIT * 2 },
        { left: left - BORDER_HIT, top: top + BORDER_HIT, width: BORDER_HIT * 2, height: screenH - BORDER_HIT * 2 },
        { left: left + screenW - BORDER_HIT, top: top + BORDER_HIT, width: BORDER_HIT * 2, height: screenH - BORDER_HIT * 2 },
      ].map((style, i) => (
        <div
          key={i}
          className="pointer-events-auto cursor-move"
          style={{ position: 'absolute', ...style }}
          onMouseDown={(e) => { e.stopPropagation(); onMouseDown(e); }}
        />
      ))}
      {/* Resize handles — only when selected */}
      {isSelected &&
        (['nw', 'ne', 'sw', 'se'] as const).map((corner) => {
          const isRight = corner.includes('e');
          const isBottom = corner.includes('s');
          return (
            <div
              key={corner}
              className="pointer-events-auto absolute w-2.5 h-2.5 bg-white border-2 border-red-500 rounded-sm"
              style={{
                left: isRight ? left + screenW - 5 : left - 5,
                top: isBottom ? top + screenH - 5 : top - 5,
                cursor: corner === 'nw' || corner === 'se' ? 'nwse-resize' : 'nesw-resize',
              }}
              onMouseDown={(e) => { e.stopPropagation(); onMouseDown(e, `resize-${corner}`); }}
            />
          );
        })}
    </div>
  );
});

// ── Selection Handles ────────────────────────────────────────────

function SelectionHandles({
  targetId,
  target,
  frameState,
  viewport,
  allTargets,
}: {
  targetId: string;
  target: AnimatableTarget;
  frameState: FrameState;
  viewport: ViewportState;
  allTargets: AnimatableTarget[];
}) {
  const state = frameState.get(targetId);
  const oriented = getAnimatedOrientedRect(target.originalBounds, state, target.rawOrigin);
  const totalAngle = target.originalAngle + ((state?.rotation ?? 0) * Math.PI / 180);

  const handles = getTransformHandles(
    oriented,
    totalAngle,
    viewport.zoom,
    { x: viewport.panX, y: viewport.panY },
  );

  // Compute selection rect in screen space
  const bounds = getTargetAnimatedBounds(target, frameState, allTargets);

  if (import.meta.env.DEV) {
    console.debug('[Overlay] SelectionHandles', {
      id: targetId.slice(0, 20),
      type: target.type,
      rawOrigin: target.rawOrigin ? { x: target.rawOrigin.x, w: target.rawOrigin.width } : null,
      originalBounds: { x: Math.round(target.originalBounds.x), w: Math.round(target.originalBounds.width) },
      animatedBounds: { x: Math.round(bounds.x), w: Math.round(bounds.width) },
      oriented: { x: Math.round(oriented.x), w: Math.round(oriented.width) },
    });
  }

  const screenLeft = bounds.x * viewport.zoom + viewport.panX;
  const screenTop = bounds.y * viewport.zoom + viewport.panY;
  const screenWidth = bounds.width * viewport.zoom;
  const screenHeight = bounds.height * viewport.zoom;

  if (screenWidth === 0 || screenHeight === 0) return null;

  return (
    <>
      {/* Selection rectangle */}
      <div
        className="pointer-events-none absolute border border-indigo-500"
        style={{
          left: screenLeft,
          top: screenTop,
          width: screenWidth,
          height: screenHeight,
          borderStyle: 'dashed',
        }}
      />
      {/* Resize handles — pointer events for cursor, clicks bubble to container */}
      {handles.map((handle) => (
        <div
          key={handle.id}
          className="pointer-events-auto absolute bg-white border border-indigo-500 rounded-sm"
          style={{
            left: handle.x,
            top: handle.y,
            width: handle.size,
            height: handle.size,
            cursor: handle.cursor,
          }}
        />
      ))}
    </>
  );
}

// ── Main Overlay Component ───────────────────────────────────────

export const InteractionOverlay = memo(function InteractionOverlay({
  targets,
  selectedIds,
  frameState,
  viewport,
  cameraFrame,
  marquee,
  onCameraMouseDown,
}: InteractionOverlayProps) {
  // Compute marquee rect
  const marqueeRect = marquee
    ? {
        left: Math.min(marquee.startX, marquee.currentX),
        top: Math.min(marquee.startY, marquee.currentY),
        width: Math.abs(marquee.currentX - marquee.startX),
        height: Math.abs(marquee.currentY - marquee.startY),
      }
    : null;

  return (
    <>
      {/* Camera frame overlay */}
      <CameraFrameOverlayInner
        cameraFrame={cameraFrame}
        frameState={frameState}
        viewport={viewport}
        isSelected={selectedIds.includes(CAMERA_FRAME_TARGET_ID)}
        onMouseDown={onCameraMouseDown}
      />

      {/* Selection handles for selected elements */}
      {selectedIds
        .filter((id) => id !== CAMERA_FRAME_TARGET_ID)
        .map((selId) => {
          const target = targets.find(t => t.id === selId);
          if (!target) return null;
          return (
            <SelectionHandles
              key={selId}
              targetId={selId}
              target={target}
              frameState={frameState}
              viewport={viewport}
              allTargets={targets}
            />
          );
        })}

      {/* Marquee selection rectangle */}
      {marqueeRect && marqueeRect.width > 3 && marqueeRect.height > 3 && (
        <div
          className="absolute border-2 border-indigo-400/60 bg-indigo-400/10 pointer-events-none"
          style={{
            left: marqueeRect.left,
            top: marqueeRect.top,
            width: marqueeRect.width,
            height: marqueeRect.height,
          }}
        />
      )}
    </>
  );
});

import type React from 'react';
import { IconMovie } from '@tabler/icons-react';
import type { CameraOverlayPosition } from './cameraOverlayMath';

interface CameraFrameOverlayProps {
  position: CameraOverlayPosition;
  isSelected: boolean;
  onMouseDown: (e: React.MouseEvent, handle?: string) => void;
  aspectRatio?: string;
}

export function CameraFrameOverlay({
  position,
  isSelected,
  onMouseDown,
  aspectRatio,
}: CameraFrameOverlayProps) {
  const { frameLeft, frameTop, screenW, screenH } = position;

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ overflow: 'hidden', zIndex: 10 }}>
      <div
        className="absolute inset-0"
        style={{
          background: 'var(--color-overlay)',
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
      <div
        style={{
          position: 'absolute',
          left: frameLeft,
          top: frameTop,
          width: screenW,
          height: screenH,
          border: `2px solid ${isSelected ? 'var(--color-camera-frame-selected)' : 'var(--color-camera-frame)'}`,
          borderRadius: 2,
        }}
      >
        <span
          className="absolute text-white text-[10px] px-1 rounded-sm flex items-center gap-0.5 select-none pointer-events-none"
          style={{ top: -18, left: 0, background: 'var(--color-overlay-heavy)' }}
        >
          <IconMovie size={10} /> {aspectRatio}
        </span>
      </div>

      {(() => {
        const B = 6;
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
              onMouseDown(e);
            }}
          />
        ));
      })()}

      {isSelected &&
        (['nw', 'ne', 'sw', 'se'] as const).map((corner) => {
          const isRight = corner.includes('e');
          const isBottom = corner.includes('s');
          return (
            <div
              key={corner}
              className="pointer-events-auto absolute w-2.5 h-2.5 bg-surface border-2 border-camera-frame rounded-sm"
              style={{
                left: isRight ? frameLeft + screenW - 5 : frameLeft - 5,
                top: isBottom ? frameTop + screenH - 5 : frameTop - 5,
                cursor: corner === 'nw' || corner === 'se' ? 'nwse-resize' : 'nesw-resize',
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
                onMouseDown(e, `resize-${corner}`);
              }}
            />
          );
        })}
    </div>
  );
}


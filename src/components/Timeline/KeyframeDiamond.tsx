import type { MouseEvent } from 'react';
import { Box } from '@mantine/core';
import type { Keyframe } from '../../types/animation';

export interface KeyframeDiamondProps {
  keyframe: Keyframe;
  x: number;
  isSelected: boolean;
  isHighlighted: boolean;
  onDragStart: (id: string, startX: number, toggleSelection: boolean) => void;
}

export function KeyframeDiamond({
  keyframe,
  x,
  isSelected,
  isHighlighted,
  onDragStart,
}: KeyframeDiamondProps) {
  const handleMouseDown = (e: MouseEvent) => {
    e.stopPropagation();
    onDragStart(keyframe.id, e.clientX, e.shiftKey || e.ctrlKey || e.metaKey);
  };

  return (
    <Box
      component="button"
      type="button"
      className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rotate-45 cursor-pointer
        transition-colors border
        ${
          isSelected
            ? 'bg-accent border-accent shadow-sm shadow-accent/50'
            : isHighlighted
              ? 'bg-accent/30 border-accent/70'
              : 'bg-text-muted border-border hover:bg-accent'
        }`}
      style={{ left: `${x}px` }}
      onMouseDown={handleMouseDown}
      title={`t=${keyframe.time}ms, v=${keyframe.value}`}
      aria-label={`Keyframe at ${keyframe.time}ms, value ${keyframe.value}`}
      aria-pressed={isSelected}
      data-highlighted={isHighlighted || undefined}
    />
  );
}

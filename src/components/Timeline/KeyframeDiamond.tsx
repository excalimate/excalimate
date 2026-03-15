import type { MouseEvent } from 'react';
import type { Keyframe } from '../../types/animation';

export interface KeyframeDiamondProps {
  keyframe: Keyframe;
  x: number;
  isSelected: boolean;
  onSelect: (id: string, addToSelection: boolean) => void;
  onDragStart: (id: string, startX: number) => void;
}

export function KeyframeDiamond({ keyframe, x, isSelected, onSelect, onDragStart }: KeyframeDiamondProps) {
  const handleMouseDown = (e: MouseEvent) => {
    e.stopPropagation();
    onSelect(keyframe.id, e.shiftKey || e.ctrlKey || e.metaKey);
    onDragStart(keyframe.id, e.clientX);
  };

  return (
    <div
      className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rotate-45 cursor-pointer
        transition-colors border
        ${
          isSelected
            ? 'bg-accent border-accent shadow-sm shadow-accent/50'
            : 'bg-text-muted border-border hover:bg-accent'
        }`}
      style={{ left: `${x}px` }}
      onMouseDown={handleMouseDown}
      title={`t=${keyframe.time}ms, v=${keyframe.value}`}
      aria-label={`Keyframe at ${keyframe.time}ms, value ${keyframe.value}`}
      tabIndex={0}
    />
  );
}

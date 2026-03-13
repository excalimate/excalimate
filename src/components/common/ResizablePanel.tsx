import { useState, useRef, useCallback, useEffect } from 'react';
import type { ReactNode, MouseEvent } from 'react';

type Direction = 'horizontal' | 'vertical';

interface ResizablePanelProps {
  direction: Direction;
  initialSize: number;
  minSize?: number;
  maxSize?: number;
  children: ReactNode;
  resizerPosition?: 'start' | 'end';
  className?: string;
  onResize?: (size: number) => void;
}

export function ResizablePanel({
  direction,
  initialSize,
  minSize = 100,
  maxSize = Infinity,
  children,
  resizerPosition = 'end',
  className,
  onResize,
}: ResizablePanelProps) {
  const [size, setSize] = useState(initialSize);
  const isDragging = useRef(false);
  const startPos = useRef(0);
  const startSize = useRef(0);

  const isHorizontal = direction === 'horizontal';

  const clamp = useCallback(
    (v: number) => Math.min(maxSize, Math.max(minSize, v)),
    [minSize, maxSize],
  );

  const handleMouseDown = useCallback(
    (e: MouseEvent) => {
      e.preventDefault();
      isDragging.current = true;
      startPos.current = isHorizontal ? e.clientX : e.clientY;
      startSize.current = size;
      document.body.style.cursor = isHorizontal ? 'col-resize' : 'row-resize';
      document.body.style.userSelect = 'none';
    },
    [isHorizontal, size],
  );

  useEffect(() => {
    const handleMouseMove = (e: globalThis.MouseEvent) => {
      if (!isDragging.current) return;

      const currentPos = isHorizontal ? e.clientX : e.clientY;
      const delta = currentPos - startPos.current;
      const multiplier = resizerPosition === 'end' ? 1 : -1;
      const newSize = clamp(startSize.current + delta * multiplier);

      setSize(newSize);
      onResize?.(newSize);
    };

    const handleMouseUp = () => {
      if (!isDragging.current) return;
      isDragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isHorizontal, resizerPosition, clamp, onResize]);

  const resizer = (
    <div
      role="separator"
      aria-orientation={isHorizontal ? 'vertical' : 'horizontal'}
      tabIndex={0}
      onMouseDown={handleMouseDown}
      onKeyDown={(e) => {
        const step = e.shiftKey ? 20 : 5;
        if (
          (isHorizontal && e.key === 'ArrowRight') ||
          (!isHorizontal && e.key === 'ArrowDown')
        ) {
          e.preventDefault();
          const newSize = clamp(size + step * (resizerPosition === 'end' ? 1 : -1));
          setSize(newSize);
          onResize?.(newSize);
        } else if (
          (isHorizontal && e.key === 'ArrowLeft') ||
          (!isHorizontal && e.key === 'ArrowUp')
        ) {
          e.preventDefault();
          const newSize = clamp(size - step * (resizerPosition === 'end' ? 1 : -1));
          setSize(newSize);
          onResize?.(newSize);
        }
      }}
      className={`flex-shrink-0 bg-[var(--color-border)] transition-colors hover:bg-indigo-500 active:bg-indigo-500 focus:outline-none focus-visible:bg-indigo-500 ${
        isHorizontal
          ? 'w-1 cursor-col-resize hover:w-1'
          : 'h-1 cursor-row-resize hover:h-1'
      }`}
    />
  );

  const panelStyle = isHorizontal ? { width: `${size}px` } : { height: `${size}px` };

  return (
    <div
      className={`flex ${isHorizontal ? 'flex-row' : 'flex-col'} ${className ?? ''}`}
    >
      {resizerPosition === 'start' && resizer}
      <div
        className="overflow-auto flex-shrink-0"
        style={panelStyle}
      >
        {children}
      </div>
      {resizerPosition === 'end' && resizer}
    </div>
  );
}

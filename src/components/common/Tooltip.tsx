import type { ReactNode } from 'react';

interface TooltipProps {
  content: string;
  children: ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

const positionClasses: Record<string, string> = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  right: 'left-full top-1/2 -translate-y-1/2 ml-2',
};

export function Tooltip({ content, children, position = 'top' }: TooltipProps) {
  return (
    <div className="group relative inline-flex">
      {children}
      <div
        role="tooltip"
        className={`absolute z-50 hidden group-hover:block px-2 py-1 text-xs text-white bg-[#1a1a2e] border border-[var(--color-border)] rounded-md shadow-lg whitespace-nowrap pointer-events-none ${positionClasses[position]}`}
      >
        {content}
      </div>
    </div>
  );
}

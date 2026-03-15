import { computeTicks } from './timelineMath';

export interface TimeRulerProps {
  duration: number;
  zoom: number;
  scrollX: number;
  width: number;
}

export function TimeRuler({ duration, zoom, scrollX, width }: TimeRulerProps) {
  const ticks = computeTicks(duration, zoom, scrollX, width);

  return (
    <div className="relative h-6 border-b border-border bg-surface-alt select-none overflow-hidden">
      {ticks.map(({ time, x, label }) => (
        <div key={time} className="absolute top-0 h-full" style={{ left: `${x}px` }}>
          <div className="absolute bottom-0 w-px h-2 bg-text-muted" />
          <span className="absolute top-0.5 left-1 text-[10px] text-text-muted whitespace-nowrap">
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}

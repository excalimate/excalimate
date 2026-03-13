interface SliderProps {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  label?: string;
  showValue?: boolean;
  disabled?: boolean;
  className?: string;
}

export function Slider({
  value,
  onChange,
  min,
  max,
  step = 1,
  label,
  showValue = false,
  disabled = false,
  className,
}: SliderProps) {
  return (
    <div className={`flex flex-col gap-1 ${className ?? ''}`}>
      {(label || showValue) && (
        <div className="flex items-center justify-between">
          {label && (
            <label className="text-xs text-[var(--color-text-secondary)] select-none">
              {label}
            </label>
          )}
          {showValue && (
            <span className="text-xs text-[var(--color-text-secondary)] tabular-nums">
              {value}
            </span>
          )}
        </div>
      )}
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-[var(--color-border)] disabled:opacity-50 disabled:cursor-not-allowed accent-indigo-500 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-indigo-500 [&::-webkit-slider-thumb]:hover:bg-indigo-400 [&::-webkit-slider-thumb]:transition-colors [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-indigo-500 [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:hover:bg-indigo-400 [&::-moz-range-thumb]:transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50"
      />
    </div>
  );
}

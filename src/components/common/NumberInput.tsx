import { useState, useCallback } from 'react';
import type { KeyboardEvent } from 'react';

interface NumberInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  suffix?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export function NumberInput({
  value,
  onChange,
  min,
  max,
  step = 1,
  label,
  suffix,
  disabled = false,
  className,
  id,
}: NumberInputProps) {
  const [draft, setDraft] = useState<string>(String(value));
  const [isFocused, setIsFocused] = useState(false);

  const clamp = useCallback(
    (v: number): number => {
      let clamped = v;
      if (min !== undefined) clamped = Math.max(min, clamped);
      if (max !== undefined) clamped = Math.min(max, clamped);
      return clamped;
    },
    [min, max],
  );

  const commit = useCallback(
    (raw: string) => {
      const parsed = parseFloat(raw);
      if (Number.isNaN(parsed)) {
        setDraft(String(value));
        return;
      }
      const clamped = clamp(parsed);
      onChange(clamped);
      setDraft(String(clamped));
    },
    [value, clamp, onChange],
  );

  const displayValue = isFocused ? draft : String(value);

  return (
    <div className={`flex items-center gap-2 ${className ?? ''}`}>
      {label && (
        <label htmlFor={id} className="text-xs text-text-muted whitespace-nowrap select-none">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        <input
          id={id}
          type="number"
          value={displayValue}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          onChange={(e) => {
            setDraft(e.target.value);
            const parsed = parseFloat(e.target.value);
            if (!Number.isNaN(parsed)) {
              onChange(clamp(parsed));
            }
          }}
          onFocus={() => {
            setIsFocused(true);
            setDraft(String(value));
          }}
          onBlur={(e) => {
            setIsFocused(false);
            commit(e.target.value);
          }}
          onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Enter') {
              commit((e.target as HTMLInputElement).value);
              (e.target as HTMLInputElement).blur();
            }
          }}
          className={`w-full bg-surface border border-border rounded-md px-2 py-1 text-sm text-text focus:outline-none focus:ring-2 focus:ring-accent/50 disabled:opacity-50 disabled:cursor-not-allowed [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${suffix ? 'pr-8' : ''}`}
        />
        {suffix && (
          <span className="absolute right-2 text-xs text-text-muted pointer-events-none select-none">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

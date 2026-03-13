interface DropdownOption<T extends string | number = string> {
  value: T;
  label: string;
}

interface DropdownProps<T extends string | number = string> {
  value: T;
  onChange: (value: T) => void;
  options: DropdownOption<T>[];
  label?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export function Dropdown<T extends string | number = string>({
  value,
  onChange,
  options,
  label,
  disabled = false,
  className,
  id,
}: DropdownProps<T>) {
  const handleChange = (raw: string) => {
    // Preserve the original type (string or number)
    const first = options[0];
    if (first !== undefined && typeof first.value === 'number') {
      onChange(parseFloat(raw) as T);
    } else {
      onChange(raw as T);
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className ?? ''}`}>
      {label && (
        <label htmlFor={id} className="text-xs text-[var(--color-text-secondary)] whitespace-nowrap select-none">
          {label}
        </label>
      )}
      <div className="relative flex-1">
        <select
          id={id}
          value={String(value)}
          onChange={(e) => handleChange(e.target.value)}
          disabled={disabled}
          className="w-full appearance-none bg-[var(--color-surface)] border border-[var(--color-border)] rounded-md px-2 py-1 pr-7 text-sm text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-indigo-500/50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {options.map((opt) => (
            <option key={String(opt.value)} value={String(opt.value)}>
              {opt.label}
            </option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-2 flex items-center pointer-events-none">
          <svg
            className="w-3.5 h-3.5 text-[var(--color-text-secondary)]"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}

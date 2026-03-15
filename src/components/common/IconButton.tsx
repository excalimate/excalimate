import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react';

type IconButtonSize = 'sm' | 'md' | 'lg';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  tooltip?: string;
  active?: boolean;
  size?: IconButtonSize;
  ref?: Ref<HTMLButtonElement>;
}

const sizeClasses: Record<IconButtonSize, string> = {
  sm: 'w-7 h-7',
  md: 'w-8 h-8',
  lg: 'w-9 h-9',
};

export function IconButton({
  icon,
  tooltip,
  active = false,
  size = 'md',
  className,
  ref,
  ...props
}: IconButtonProps) {
  return (
    <button
      ref={ref}
      title={tooltip}
      aria-label={tooltip}
      className={`inline-flex items-center justify-center rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-accent/50 disabled:opacity-50 disabled:cursor-not-allowed ${
        active
          ? 'bg-accent-subtle text-accent'
          : 'text-text-muted hover:bg-surface-alt hover:text-text'
      } ${sizeClasses[size]} ${className ?? ''}`}
      {...props}
    >
      {icon}
    </button>
  );
}

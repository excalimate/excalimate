import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
  ref?: Ref<HTMLButtonElement>;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-indigo-500 hover:bg-indigo-600 text-white',
  secondary:
    'bg-[var(--color-surface-secondary)] hover:bg-[#3a3a4e] text-[var(--color-text)] border border-[var(--color-border)]',
  ghost: 'bg-transparent hover:bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)]',
  danger: 'bg-red-500/10 hover:bg-red-500/20 text-red-400',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-2 py-1 text-xs',
  md: 'px-3 py-1.5 text-sm',
  lg: 'px-4 py-2 text-base',
};

export function Button({
  variant = 'secondary',
  size = 'md',
  className,
  children,
  ref,
  ...props
}: ButtonProps) {
  return (
    <button
      ref={ref}
      className={`rounded-md transition-colors font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50 disabled:opacity-50 disabled:cursor-not-allowed ${variantClasses[variant]} ${sizeClasses[size]} ${className ?? ''}`}
      {...props}
    >
      {children}
    </button>
  );
}

import React from 'react';
import { MagneticButton } from './MagneticButton';

export const Button = React.forwardRef(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      icon: Icon,
      disabled = false,
      className = '',
      type = 'button',
      onClick,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center gap-2 font-bold text-sm transition-all rounded-[var(--radius-sm)] focus-visible:outline-none disabled:opacity-40 disabled:cursor-not-allowed select-none h-9 px-4 cursor-pointer relative overflow-hidden';

    const variants = {
      primary:
        'btn-primary bg-[#C5A059] hover:bg-[#b38e36] text-slate-950 font-bold active:scale-95 shadow-md shadow-amber-500/20',
      secondary:
        'bg-surface-muted border border-border-strong text-ink-900 hover:bg-surface hover:border-primary-600/60 hover:text-primary-600 active:scale-95 shadow-3d',
      ghost:
        'text-ink-600 hover:text-ink-900 hover:bg-surface-muted active:scale-95',
      destructive:
        'btn-destructive bg-danger-600 text-white hover:bg-rose-700 active:scale-95 shadow-3d font-semibold',
    };

    return (
      <MagneticButton strength={disabled ? 0 : 12}>
        <button
          ref={ref}
          type={type}
          disabled={disabled}
          onClick={onClick}
          className={`${baseStyles} ${variants[variant] || variants.primary} ${className}`}
          {...props}
        >
          {Icon && <Icon className="w-4 h-4 shrink-0" />}
          <span className="relative z-10">{children}</span>
        </button>
      </MagneticButton>
    );
  }
);

Button.displayName = 'Button';

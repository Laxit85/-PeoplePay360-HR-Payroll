import React from 'react';

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
      'inline-flex items-center justify-center gap-2 font-medium text-sm transition-all rounded-[var(--radius-sm)] focus-visible:outline-none disabled:opacity-40 disabled:cursor-not-allowed select-none h-9 px-4';

    const variants = {
      primary:
        'btn-primary bg-primary-600 text-surface-sunken hover:bg-primary-700 active:bg-primary-700 font-bold shadow-xs hover:shadow-gold',
      secondary:
        'bg-surface-muted border border-border-strong text-ink-900 hover:bg-surface hover:border-primary-600/50 hover:text-primary-600 active:bg-surface-sunken',
      ghost:
        'text-ink-600 hover:text-ink-900 hover:bg-surface-muted active:bg-surface-sunken',
      destructive:
        'btn-destructive bg-danger-600 text-white hover:bg-rose-700 active:bg-rose-800 font-semibold',
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled}
        onClick={onClick}
        className={`${baseStyles} ${variants[variant] || variants.primary} ${className}`}
        {...props}
      >
        {Icon && <Icon className="w-4 h-4 shrink-0" />}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

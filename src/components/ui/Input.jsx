import React from 'react';

export const Input = React.forwardRef(
  ({ label, error, helperText, className = '', type = 'text', ...props }, ref) => {
    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label className="text-xs font-semibold text-ink-600 uppercase tracking-wider">
            {label}
          </label>
        )}
        <input
          ref={ref}
          type={type}
          className={`w-full h-10 px-3 text-sm text-ink-900 bg-surface-muted border border-border-strong rounded-[var(--radius-sm)] placeholder:text-ink-400 focus-visible:outline-none focus:border-primary-600 transition-colors ${
            error ? 'border-danger-600 bg-danger-50/10' : ''
          } ${className}`}
          {...props}
        />
        {error && <span className="text-xs text-danger-600 font-medium">{error}</span>}
        {helperText && !error && <span className="text-xs text-ink-400">{helperText}</span>}
      </div>
    );
  }
);

Input.displayName = 'Input';

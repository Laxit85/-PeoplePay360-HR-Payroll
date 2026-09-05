import React from 'react';

export const Select = React.forwardRef(
  ({ label, error, options = [], children, className = '', ...props }, ref) => {
    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label className="text-xs font-semibold text-ink-600 uppercase tracking-wider">
            {label}
          </label>
        )}
        <select
          ref={ref}
          className={`w-full h-10 px-3 text-sm text-ink-900 bg-surface-muted border border-border-strong rounded-[var(--radius-sm)] focus-visible:outline-none focus:border-primary-600 transition-colors cursor-pointer ${
            error ? 'border-danger-600' : ''
          } ${className}`}
          {...props}
        >
          {options.length > 0
            ? options.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-surface text-ink-900">
                  {opt.label}
                </option>
              ))
            : children}
        </select>
        {error && <span className="text-xs text-danger-600 font-medium">{error}</span>}
      </div>
    );
  }
);

Select.displayName = 'Select';

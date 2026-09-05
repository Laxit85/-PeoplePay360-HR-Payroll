import React from 'react';

export function KpiCard({ title, value, subtext, icon: Icon, color = 'primary' }) {
  return (
    <div className="p-5 bg-surface border border-border rounded-[var(--radius-md)] flex flex-col justify-between gap-3 shadow-xs">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-ink-600">
          {title}
        </span>
        {Icon && (
          <div className="p-2 rounded-sm bg-surface-muted text-ink-600">
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>
      <div>
        <div className="text-2xl md:text-3xl font-extrabold font-display text-ink-900 tracking-tight tabular-nums">
          {value}
        </div>
        {subtext && <p className="text-xs text-ink-600 mt-1 font-medium">{subtext}</p>}
      </div>
    </div>
  );
}

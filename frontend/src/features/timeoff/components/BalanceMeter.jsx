import React from 'react';

export function BalanceMeter({ allocated = 0, taken = 0, remaining = 0 }) {
  const percent = allocated > 0 ? Math.min(100, Math.round((taken / allocated) * 100)) : 0;
  return (
    <div className="w-full flex flex-col gap-1 min-w-[140px]">
      <div className="flex items-center justify-between text-xs font-semibold">
        <span className="text-money-600">{remaining} days left</span>
        <span className="text-ink-400 text-[11px] font-normal">
          {taken}/{allocated} taken
        </span>
      </div>
      <div className="w-full h-2 bg-surface-muted rounded-pill overflow-hidden border border-border">
        <div
          className={`h-full transition-all ${
            remaining === 0 ? 'bg-danger-600' : percent > 80 ? 'bg-amber-600' : 'bg-money-600'
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

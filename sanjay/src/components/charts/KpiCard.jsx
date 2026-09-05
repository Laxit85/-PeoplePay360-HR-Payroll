import React from 'react';
import { TiltCard } from '../ui/TiltCard';

export function KpiCard({ title, value, subtext, icon: Icon, color = 'primary' }) {
  return (
    <TiltCard
      maxTilt={10}
      scale={1.03}
      glare={true}
      className="p-5 glass-panel rounded-[var(--radius-md)] flex flex-col justify-between gap-3 shadow-3d transition-all hover:border-primary-600/50"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-ink-600">
          {title}
        </span>
        {Icon && (
          <div className="p-2.5 rounded-sm bg-primary-600/10 text-primary-600 border border-primary-600/20 shadow-sm animate-float">
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>
      <div>
        <div className="text-2xl md:text-3xl font-black font-display text-ink-900 tracking-tight tabular-nums drop-shadow-sm">
          {value}
        </div>
        {subtext && <p className="text-xs text-ink-600 mt-1 font-semibold">{subtext}</p>}
      </div>
    </TiltCard>
  );
}

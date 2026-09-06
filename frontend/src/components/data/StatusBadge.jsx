import React from 'react';

export function StatusBadge({ status, className = '' }) {
  if (!status) return null;

  const normalized = String(status).trim().toLowerCase();

  let colorClass = 'text-ink-600 bg-surface-muted border-border';
  let dotClass = 'bg-ink-400';

  if (['active', 'approved', 'paid', 'validated', 'present'].includes(normalized)) {
    colorClass = 'text-primary-600 bg-primary-50 border-primary-600/30';
    dotClass = 'bg-primary-600';
  } else if (['pending', 'submitted', 'to approve', 'draft', 'late', 'missing checkout'].includes(normalized)) {
    colorClass = 'text-amber-600 bg-amber-50 border-amber-600/30';
    dotClass = 'bg-amber-600';
  } else if (['refused', 'expired', 'terminated', 'absent', 'danger', 'overdue'].includes(normalized)) {
    colorClass = 'text-danger-600 bg-danger-50 border-danger-600/30';
    dotClass = 'bg-danger-600';
  } else if (['overtime', 'computed'].includes(normalized)) {
    colorClass = 'text-sky-400 bg-sky-950/40 border-sky-400/30';
    dotClass = 'bg-sky-400';
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-bold rounded-pill border ${colorClass} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotClass}`} />
      <span>{status}</span>
    </span>
  );
}

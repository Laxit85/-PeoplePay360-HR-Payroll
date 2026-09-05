import React from 'react';
import { AlertTriangle } from 'lucide-react';

export function WarningsPanel({ payslips = [] }) {
  const allWarnings = [];
  payslips.forEach((ps) => {
    if (ps.warnings && ps.warnings.length) {
      ps.warnings.forEach((w) => {
        allWarnings.push({ employeeName: ps.employeeName, warning: w });
      });
    }
  });

  if (!allWarnings.length) return null;

  return (
    <div className="p-4 bg-amber-50 border border-amber-600/30 rounded-[var(--radius-md)] flex flex-col gap-2">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-600">
        <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
        <span>Batch Processing Warnings ({allWarnings.length})</span>
      </div>
      <ul className="list-disc list-inside text-xs text-ink-900 flex flex-col gap-1 pl-1">
        {allWarnings.map((item, idx) => (
          <li key={idx}>
            <strong className="font-semibold text-ink-900">{item.employeeName}:</strong>{' '}
            <span className="text-amber-600">{item.warning}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

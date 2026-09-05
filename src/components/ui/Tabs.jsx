import React from 'react';

export function Tabs({ tabs = [], activeTab, onChange }) {
  return (
    <div className="flex border-b border-border bg-surface-sunken px-4 pt-2 gap-2">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-sm transition-colors border-b-2 ${
            activeTab === t.id
              ? 'bg-surface text-primary-600 border-primary-600'
              : 'text-ink-600 border-transparent hover:text-ink-900'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export function StatusDonutChart({ data = [] }) {
  const themedData = data.map((d, i) => {
    let color = d.color;
    if (d.name === 'Paid') color = '#C5A059'; // Gold
    if (d.name === 'Validated') color = '#38BDF8'; // Slate blue
    if (d.name === 'Computed') color = '#94A3B8'; // Metallic steel
    if (d.name === 'Warning') color = '#BE123C'; // Muted crimson
    return { ...d, color };
  });

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={themedData}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={80}
            paddingAngle={4}
            dataKey="value"
          >
            {themedData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} stroke="var(--surface)" strokeWidth={2} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--surface)',
              borderColor: 'var(--border-strong)',
              borderRadius: '6px',
              color: 'var(--ink-900)',
              fontSize: '12px',
              fontWeight: 600,
            }}
          />
          <Legend
            verticalAlign="bottom"
            height={36}
            iconType="circle"
            wrapperStyle={{ fontSize: '12px', color: 'var(--ink-600)' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

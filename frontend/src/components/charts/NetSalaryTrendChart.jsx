import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { formatCurrency } from '../../lib/format';

export function NetSalaryTrendChart({ data = [] }) {
  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 25 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="month"
            stroke="var(--ink-600)"
            fontSize={12}
            tickLine={false}
            axisLine={{ stroke: 'var(--border)' }}
          />
          <YAxis
            stroke="var(--ink-600)"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `$${v / 1000}k`}
          />
          <Tooltip
            formatter={(value) => [formatCurrency(value), 'Net Paid']}
            contentStyle={{
              backgroundColor: 'var(--surface)',
              borderColor: 'var(--border-strong)',
              borderRadius: '6px',
              color: 'var(--ink-900)',
              fontSize: '12px',
              fontWeight: 600,
            }}
          />
          <Line
            type="monotone"
            dataKey="netPaid"
            stroke="var(--primary-600)"
            strokeWidth={3}
            dot={{ r: 4, fill: 'var(--primary-600)' }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

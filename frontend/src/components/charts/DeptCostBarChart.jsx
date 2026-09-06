import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { formatCurrency } from '../../lib/format';

export function DeptCostBarChart({ data = [], currency = 'INR' }) {
  // Normalize data keys to ensure department and grossCost are always present
  const chartData = data.map((item) => ({
    ...item,
    department: item.department || item.dept || 'General',
    grossCost: item.grossCost !== undefined ? item.grossCost : (item.gross || 0),
  }));

  const symbol = currency === 'USD' ? '$' : '₹';

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 25 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="department"
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
            tickFormatter={(v) => `${symbol}${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`}
          />
          <Tooltip
            formatter={(value) => [formatCurrency(value, currency), 'Gross Cost']}
            contentStyle={{
              backgroundColor: 'var(--surface)',
              borderColor: 'var(--border-strong)',
              borderRadius: '6px',
              color: 'var(--ink-900)',
              fontSize: '12px',
              fontWeight: 600,
            }}
          />
          <Bar dataKey="grossCost" fill="var(--primary-600)" radius={[4, 4, 0, 0]} maxBarSize={40} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

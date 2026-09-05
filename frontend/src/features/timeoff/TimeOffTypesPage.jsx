import React, { useState, useEffect } from 'react';
import { Settings2 } from 'lucide-react';
import { getTimeOffTypesApi } from '../../api';
import { DataTable } from '../../components/data/DataTable';
import { StatusBadge } from '../../components/data/StatusBadge';

export function TimeOffTypesPage() {
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTimeOffTypesApi()
      .then((res) => {
        const rows = res?.data || res || [];
        setTypes(
          rows.map((t) => ({
            ...t,
            id: t.id,
            name: t.name,
            code: t.code,
            unit: t.unit || 'DAYS',
            requiresApproval: true,
            requiresAllocation: Boolean(t.requires_allocation ?? 1),
          }))
        );
      })
      .catch((err) => console.error('Failed to fetch time off types', err))
      .finally(() => setLoading(false));
  }, []);

  const columns = [
    {
      key: 'name',
      header: 'Policy Name',
      render: (val, row) => (
        <div className="flex items-center gap-2">
          <span
            className="w-3 h-3 rounded-full shrink-0"
            style={{ backgroundColor: row.color || '#2E4BD9' }}
          />
          <span className="font-bold text-ink-900">{val}</span>
        </div>
      ),
    },
    { key: 'code', header: 'Code' },
    { key: 'unit', header: 'Accrual Unit' },
    {
      key: 'requiresApproval',
      header: 'Requires Approval',
      render: (val) => (val ? <StatusBadge status="Approved" /> : <span className="text-xs text-ink-400">No</span>),
    },
    {
      key: 'requiresAllocation',
      header: 'Requires Allocation Balance',
      render: (val) =>
        val ? (
          <span className="px-2 py-0.5 rounded-pill bg-primary-50 text-primary-600 text-xs font-semibold">
            ● Allocation Required
          </span>
        ) : (
          <span className="text-xs text-ink-600 font-medium">● Free Grant (No Allocation Needed)</span>
        ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold font-display text-ink-900 flex items-center gap-2">
          <Settings2 className="w-6 h-6 text-primary-600" />
          <span>Time Off Types & Policies</span>
        </h1>
        <p className="text-xs text-ink-600 mt-1">
          Configured leave rules — unit, approval requirement, and allocation balance requirement
        </p>
      </div>

      <DataTable columns={columns} data={types} emptyMessage="No time off types configured" />
    </div>
  );
}

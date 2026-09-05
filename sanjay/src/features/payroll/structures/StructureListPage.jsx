import React, { useState, useEffect } from 'react';
import { Layers } from 'lucide-react';
import { getSalaryStructures } from '../../../mockApi/apiHandlers';
import { DataTable } from '../../../components/data/DataTable';

export function StructureListPage() {
  const [structures, setStructures] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSalaryStructures().then(setStructures).finally(() => setLoading(false));
  }, []);

  const columns = [
    { key: 'name', header: 'Structure Name' },
    { key: 'code', header: 'Structure Code' },
    {
      key: 'rules',
      header: 'Included Salary Rules (In Sequence)',
      render: (rules) => (
        <div className="flex flex-wrap items-center gap-1.5">
          {rules && rules.length > 0 ? (
            rules.map((r) => (
              <span
                key={r.id}
                className="px-2 py-0.5 rounded-pill bg-surface-muted border border-border text-xs font-semibold text-ink-900"
              >
                {r.sequence}. {r.code} ({r.category})
              </span>
            ))
          ) : (
            <span className="text-xs text-ink-400">No rules assigned</span>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold font-display text-ink-900 flex items-center gap-2">
          <Layers className="w-6 h-6 text-primary-600" />
          <span>Salary Structures</span>
        </h1>
        <p className="text-xs text-ink-600 mt-1">
          Ordered collections of Salary Rules used by Pay Runs to calculate individual payslips.
        </p>
      </div>

      <DataTable columns={columns} data={structures} emptyMessage="No salary structures found" />
    </div>
  );
}

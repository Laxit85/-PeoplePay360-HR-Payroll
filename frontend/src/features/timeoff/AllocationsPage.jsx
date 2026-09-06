import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Award } from 'lucide-react';
import { getTimeOffAllocationsApi } from '../../api';
import { DataTable } from '../../components/data/DataTable';
import { BalanceMeter } from './components/BalanceMeter';

export function AllocationsPage() {
  const [searchParams] = useSearchParams();
  const empFilter = searchParams.get('employeeId');

  const [allocations, setAllocations] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAllocations = async () => {
    setLoading(true);
    try {
      const res = await getTimeOffAllocationsApi({ employee_id: empFilter });
      const raw = res?.data || res || [];
      const formatted = raw.map((a) => {
        const empName = a.first_name
          ? `${a.first_name} ${a.last_name || ''}`.trim()
          : a.employee_name || 'Employee';
        const empCode = a.employee_code ? `(${a.employee_code})` : '';
        const alloc = parseFloat(a.allocated_days ?? 0);
        const taken = parseFloat(a.taken_days ?? 0);
        const remaining = parseFloat(a.remaining_days ?? (alloc - taken));
        const yr = a.valid_from ? new Date(a.valid_from).getFullYear() : 2026;

        return {
          id: a.id,
          employeeName: `${empName} ${empCode}`.trim(),
          typeName: a.time_off_type_name || a.type_name || 'Leave',
          year: yr,
          allocated: alloc,
          taken: taken,
          remaining: remaining,
        };
      });
      setAllocations(formatted);
    } catch (err) {
      console.error('Failed to load allocations', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllocations();
  }, [empFilter]);

  const columns = [
    { key: 'employeeName', header: 'Employee' },
    { key: 'typeName', header: 'Time Off Type' },
    { key: 'year', header: 'Year', align: 'center' },
    {
      key: 'allocated',
      header: 'Allocated',
      align: 'center',
      render: (val) => <span className="font-semibold">{val} days</span>,
    },
    {
      key: 'taken',
      header: 'Taken',
      align: 'center',
      render: (val) => <span className="text-amber-600 font-semibold">{val} days</span>,
    },
    {
      key: 'balance',
      header: 'Remaining Balance Meter',
      render: (_, row) => (
        <BalanceMeter
          allocated={row.allocated}
          taken={row.taken}
          remaining={row.remaining}
        />
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-ink-900 flex items-center gap-2">
            <Award className="w-6 h-6 text-primary-600" />
            <span>Time Off Allocations Balance</span>
          </h1>
          <p className="text-xs text-ink-600 mt-1">
            Allocated, taken, and remaining leave balances per employee and leave type
          </p>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={allocations}
        emptyMessage="No allocations found"
      />
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Award } from 'lucide-react';
import { getTimeOffAllocationsApi } from '../../api';
import { DataTable } from '../../components/data/DataTable';
import { BalanceMeter } from './components/BalanceMeter';

import { useAuth } from '../../auth/useAuth';

export function AllocationsPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const empFilter = searchParams.get('employeeId');

  const [allocations, setAllocations] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAllocations = async () => {
    setLoading(true);
    try {
      const params = {};
      if (user?.role === 'EMPLOYEE') {
        if (user.employeeId) params.employee_id = user.employeeId;
      } else if (empFilter) {
        params.employee_id = empFilter;
      }
      const res = await getTimeOffAllocationsApi(params);
      const rows = res?.data || res || [];
      const list = rows.map((a) => ({
        ...a,
        id: a.id,
        employeeName: `${a.first_name || ''} ${a.last_name || ''}`.trim() || `Employee #${a.employee_id}`,
        typeName: a.time_off_type_name || 'Standard Leave',
        year: a.valid_from ? new Date(a.valid_from).getFullYear() : 2026,
        allocated: parseFloat(a.allocated_days || 0),
        taken: parseFloat(a.taken_days || 0),
        remaining: parseFloat(a.remaining_days || 0),
      }));
      setAllocations(list);
    } catch (err) {
      console.error('Failed to fetch allocations', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllocations();
  }, [empFilter, user]);

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

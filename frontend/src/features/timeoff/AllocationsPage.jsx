import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Award } from 'lucide-react';
import { getTimeOffAllocations } from '../../mockApi/apiHandlers';
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
      const list = await getTimeOffAllocations(empFilter);
      setAllocations(list);
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

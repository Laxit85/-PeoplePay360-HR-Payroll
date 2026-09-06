import React from 'react';
import { CurrencyCell } from '../../../../components/data/CurrencyCell';
import { formatDate } from '../../../../lib/format';
import { AlertCircle, CheckSquare, Square } from 'lucide-react';

export function StepEmployeeSelect({
  eligibleEmployees = [],
  selectedEmployeeIds = [],
  setSelectedEmployeeIds,
  loading = false,
}) {
  const toggleAll = () => {
    if (selectedEmployeeIds.length === eligibleEmployees.length) {
      setSelectedEmployeeIds([]);
    } else {
      setSelectedEmployeeIds(eligibleEmployees.map((e) => e.employeeId));
    }
  };

  const toggleSelect = (id) => {
    if (selectedEmployeeIds.includes(id)) {
      setSelectedEmployeeIds(selectedEmployeeIds.filter((x) => x !== id));
    } else {
      setSelectedEmployeeIds([...selectedEmployeeIds, id]);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-xs text-ink-600 font-medium">
        Querying eligible active contracts overlapping selected pay period...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="p-3 bg-amber-50 border border-amber-600/20 rounded-sm text-xs text-amber-600 font-medium flex items-center justify-between">
        <span>
          Step 2 of 2: Select eligible employee records for this pay run ({selectedEmployeeIds.length}/{eligibleEmployees.length} selected).
        </span>
        <button
          type="button"
          onClick={toggleAll}
          className="underline font-bold hover:text-ink-900 text-xs"
        >
          {selectedEmployeeIds.length === eligibleEmployees.length ? 'Deselect All' : 'Select All'}
        </button>
      </div>

      {eligibleEmployees.length === 0 ? (
        <div className="p-6 text-center text-xs text-amber-600 bg-amber-500/10 border border-amber-500/20 rounded-sm flex flex-col items-center gap-3">
          <span>No employees with an <strong>ACTIVE</strong> contract overlapping this pay period were found.</span>
          <a
            href="/contracts"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#C5A059] hover:bg-[#b38e36] text-slate-950 rounded-sm font-bold text-xs transition-colors"
          >
            Go to Contracts Directory &rarr;
          </a>
        </div>
      ) : (
        <div className="border border-border rounded-sm overflow-hidden max-h-64 overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-surface-muted border-b border-border text-ink-600 font-semibold h-8">
                <th className="px-3 py-1 w-10 text-center">✓</th>
                <th className="px-3 py-1">Employee</th>
                <th className="px-3 py-1">Department</th>
                <th className="px-3 py-1">Contract Start</th>
                <th className="px-3 py-1 text-right">Monthly Wage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {eligibleEmployees.map((emp) => {
                const isSelected = selectedEmployeeIds.includes(emp.employeeId);
                return (
                  <tr
                    key={emp.employeeId}
                    onClick={() => toggleSelect(emp.employeeId)}
                    className={`h-9 cursor-pointer transition-colors ${
                      isSelected ? 'bg-primary-50/60' : 'hover:bg-surface-sunken'
                    }`}
                  >
                    <td className="px-3 py-1 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="rounded border-border-strong text-primary-600 focus:ring-0 cursor-pointer"
                      />
                    </td>
                    <td className="px-3 py-1 font-bold text-ink-900">
                      {emp.employeeName || emp.name || `Employee #${emp.employeeId}`}
                      {!emp.hasBankDetails && (
                        <span className="ml-2 px-1.5 py-0.2 text-[10px] bg-amber-50 text-amber-600 rounded-pill border border-amber-600/30">
                          Missing Bank
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-1 text-ink-600">{emp.department}</td>
                    <td className="px-3 py-1 text-ink-600">{formatDate(emp.startDate)}</td>
                    <td className="px-3 py-1 text-right font-semibold">
                      <CurrencyCell amount={emp.wage} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

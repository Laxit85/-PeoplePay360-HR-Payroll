import React from 'react';
import { Select } from '../../../components/ui/Select';
import { Filter, User, Building2, Calendar, Briefcase, RotateCcw } from 'lucide-react';

export function FilterBar({
  filters,
  setFilters,
  filterOptions = {},
  onReset,
}) {
  const employees = filterOptions.employees || [];
  const departments = filterOptions.departments || [];
  const periods = filterOptions.periods || [];

  const handleChange = (key, val) => {
    setFilters((prev) => ({ ...prev, [key]: val }));
  };

  const isFiltered =
    filters.employeeId !== 'All' ||
    filters.department !== 'All' ||
    filters.employeeType !== 'All' ||
    (filters.period && filters.period !== '2026-09');

  return (
    <div className="p-4 bg-surface border border-border rounded-[var(--radius-md)] flex flex-col gap-3 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-ink-600">
          <Filter className="w-4 h-4 text-primary-600" />
          <span>Live Dashboard & Salary Database Filters</span>
          {isFiltered && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#C5A059] text-slate-950 ml-1">
              Active Filter
            </span>
          )}
        </div>

        {isFiltered && (
          <button
            type="button"
            onClick={onReset}
            className="flex items-center gap-1.5 text-xs text-ink-600 hover:text-ink-900 font-semibold cursor-pointer transition-colors self-start sm:self-auto"
          >
            <RotateCcw className="w-3.5 h-3.5 text-primary-600" />
            <span>Reset All Filters</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        {/* 1. Employee Filter (Connected directly to Employee Salary Database) */}
        <div>
          <label className="text-[11px] font-bold text-ink-600 flex items-center gap-1 mb-1">
            <User className="w-3.5 h-3.5 text-primary-600" />
            <span>Employee</span>
          </label>
          <Select
            value={filters.employeeId || 'All'}
            onChange={(e) => handleChange('employeeId', e.target.value)}
          >
            <option value="All">All Employees (Entire Team)</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.name} ({emp.code}) — ₹{Number(emp.contract_wage || 0).toLocaleString('en-IN')}/mo
              </option>
            ))}
          </Select>
        </div>

        {/* 2. Department Filter */}
        <div>
          <label className="text-[11px] font-bold text-ink-600 flex items-center gap-1 mb-1">
            <Building2 className="w-3.5 h-3.5 text-primary-600" />
            <span>Department</span>
          </label>
          <Select
            value={filters.department || 'All'}
            onChange={(e) => handleChange('department', e.target.value)}
          >
            <option value="All">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.code})
              </option>
            ))}
          </Select>
        </div>

        {/* 3. Pay Period Filter */}
        <div>
          <label className="text-[11px] font-bold text-ink-600 flex items-center gap-1 mb-1">
            <Calendar className="w-3.5 h-3.5 text-primary-600" />
            <span>Pay Run Period</span>
          </label>
          <Select
            value={filters.period || '2026-09'}
            onChange={(e) => handleChange('period', e.target.value)}
          >
            <option value="all">All Pay Periods (All Time)</option>
            <option value="2026-09">September 2026</option>
            <option value="2026-08">August 2026</option>
            <option value="2026-07">July 2026</option>
            {periods
              .filter((p) => !['2026-09', '2026-08', '2026-07'].includes(p.period_code))
              .map((p) => (
                <option key={p.period_code} value={p.period_code}>
                  {p.period_label || p.period_code}
                </option>
              ))}
          </Select>
        </div>

        {/* 4. Employment Type Filter */}
        <div>
          <label className="text-[11px] font-bold text-ink-600 flex items-center gap-1 mb-1">
            <Briefcase className="w-3.5 h-3.5 text-primary-600" />
            <span>Employment Type</span>
          </label>
          <Select
            value={filters.employeeType || 'All'}
            onChange={(e) => handleChange('employeeType', e.target.value)}
          >
            <option value="All">All Employment Types</option>
            <option value="FULL_TIME">Full-time</option>
            <option value="PART_TIME">Part-time</option>
            <option value="CONTRACTOR">Contractor</option>
            <option value="INTERN">Intern</option>
          </Select>
        </div>
      </div>
    </div>
  );
}

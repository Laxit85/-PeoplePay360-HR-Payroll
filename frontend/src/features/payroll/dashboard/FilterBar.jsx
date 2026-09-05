import React from 'react';
import { Select } from '../../../components/ui/Select';
import { Filter } from 'lucide-react';

export function FilterBar({ filters, setFilters }) {
  const handleChange = (key, val) => {
    setFilters((prev) => ({ ...prev, [key]: val }));
  };

  return (
    <div className="p-4 bg-surface border border-border rounded-[var(--radius-md)] flex flex-wrap items-center gap-4 shadow-xs">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-ink-600 mr-2">
        <Filter className="w-4 h-4 text-primary-600" />
        <span>Live Dashboard Filters</span>
      </div>

      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        <Select
          value={filters.period || '2026-09'}
          onChange={(e) => handleChange('period', e.target.value)}
        >
          <option value="2026-09">September 2026</option>
          <option value="2026-08">August 2026</option>
          <option value="2026-07">July 2026</option>
        </Select>

        <Select
          value={filters.department || 'All'}
          onChange={(e) => handleChange('department', e.target.value)}
        >
          <option value="All">All Departments</option>
          <option value="Executive">Executive</option>
          <option value="Engineering">Engineering</option>
          <option value="Human Resources">Human Resources</option>
          <option value="Finance & Payroll">Finance & Payroll</option>
          <option value="Operations">Operations</option>
          <option value="Product">Product</option>
        </Select>

        <Select
          value={filters.employeeType || 'All'}
          onChange={(e) => handleChange('employeeType', e.target.value)}
        >
          <option value="All">All Employment Types</option>
          <option value="Full-time">Full-time</option>
          <option value="Part-time">Part-time</option>
          <option value="Contractor">Contractor</option>
          <option value="Intern">Intern</option>
        </Select>

        <Select
          value={filters.company || 'All'}
          onChange={(e) => handleChange('company', e.target.value)}
        >
          <option value="All">All Companies</option>
          <option value="OXP Global Inc.">OXP Global Inc.</option>
        </Select>
      </div>
    </div>
  );
}

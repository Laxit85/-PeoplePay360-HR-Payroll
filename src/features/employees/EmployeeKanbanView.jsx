import React from 'react';
import { Briefcase, Building } from 'lucide-react';

export function EmployeeCard({ employee, onClick }) {
  return (
    <div
      onClick={onClick}
      className="p-4 bg-surface border border-border rounded-[var(--radius-md)] hover:border-primary-600/60 hover:shadow-gold transition-all cursor-pointer flex flex-col justify-between gap-3 group"
    >
      <div className="flex items-start gap-3">
        <img
          src={employee.avatarUrl}
          alt={employee.name}
          className="w-12 h-12 rounded-full object-cover border border-primary-600/40 shrink-0"
        />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-ink-900 group-hover:text-primary-600 transition-colors truncate">
            {employee.name}
          </h3>
          <p className="text-xs text-ink-600 truncate flex items-center gap-1 mt-0.5">
            <Briefcase className="w-3 h-3 text-primary-600 shrink-0" />
            <span>{employee.jobTitle}</span>
          </p>
          <p className="text-xs text-ink-600 truncate flex items-center gap-1 mt-0.5">
            <Building className="w-3 h-3 text-ink-400 shrink-0" />
            <span>{employee.department}</span>
          </p>
        </div>
      </div>

      <div className="pt-2.5 border-t border-border flex items-center justify-between text-xs text-ink-600">
        <span className="px-2.5 py-0.5 rounded-pill bg-surface-muted border border-border text-[11px] font-semibold text-ink-900">
          {employee.employeeType || 'Full-time'}
        </span>
        <div className="flex items-center gap-3">
          <span className="font-bold text-primary-600">
            {employee.counts?.contracts || 0} Contracts
          </span>
        </div>
      </div>
    </div>
  );
}

export function EmployeeKanbanView({ employees = [], onSelect }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {employees.map((emp) => (
        <EmployeeCard key={emp.id} employee={emp} onClick={() => onSelect(emp)} />
      ))}
    </div>
  );
}

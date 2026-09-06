import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, Building, FileText } from 'lucide-react';

export function EmployeeCard({ employee, onClick }) {
  const navigate = useNavigate();

  return (
    <div
      onClick={onClick}
      className="p-4 bg-[#131726] border border-[#232d4b] rounded-xl hover:border-[#C5A059]/80 hover:shadow-[0_4px_25px_rgba(197,160,89,0.18)] transition-all cursor-pointer flex flex-col justify-between gap-3.5 group shadow-md"
    >
      <div className="flex items-start gap-3">
        <img
          src={employee.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(employee.name || 'User')}&background=random`}
          alt={employee.name}
          className="w-12 h-12 rounded-full object-cover border-2 border-[#C5A059]/60 shrink-0 shadow-sm"
        />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-slate-100 group-hover:text-[#C5A059] transition-colors truncate">
            {employee.name}
          </h3>
          <p className="text-xs text-slate-300 truncate flex items-center gap-1.5 mt-0.5 font-medium">
            <Briefcase className="w-3.5 h-3.5 text-[#C5A059] shrink-0" />
            <span className="truncate">{employee.jobTitle}</span>
          </p>
          <p className="text-xs text-slate-400 truncate flex items-center gap-1.5 mt-0.5">
            <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{employee.department}</span>
          </p>
        </div>
      </div>

      <div className="pt-3 border-t border-[#232d4b] flex items-center justify-between text-xs">
        <span className="px-2.5 py-0.5 rounded-full bg-slate-800/90 border border-slate-700 text-[11px] font-semibold text-slate-200">
          {employee.employeeType || 'Full-time'}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/employees/${employee.id}/contracts`);
          }}
          className="flex items-center gap-1.5 font-bold text-xs text-[#C5A059] hover:text-slate-950 bg-[#C5A059]/15 hover:bg-[#C5A059] px-2.5 py-1 rounded border border-[#C5A059]/35 transition-all cursor-pointer"
          title={`View and manage contracts for ${employee.name}`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Contracts ({employee.counts?.contracts || 0})</span>
        </button>
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


import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutGrid, List as ListIcon, Plus, Search, Users, FileText } from 'lucide-react';
import { getEmployeesApi, createEmployeeApi, getDepartmentsApi } from '../../api';
import { EmployeeKanbanView } from './EmployeeKanbanView';
import { DataTable } from '../../components/data/DataTable';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';
import { useAuth } from '../../auth/useAuth';

export function EmployeeListPage() {
  const navigate = useNavigate();
  const { can, user } = useAuth();
  const canCreate = user?.role === 'ADMIN' || user?.role === 'HR_MANAGER' || can('employees.create');
  const [viewMode, setViewMode] = useState('kanban'); // kanban | list
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Dynamic Departments
  const [departmentsList, setDepartmentsList] = useState([]);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('1');

  // Form state
  const [name, setName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [workEmail, setWorkEmail] = useState('');
  const [workPhone, setWorkPhone] = useState('');
  const [wage, setWage] = useState('35000');
  const [employeeType, setEmployeeType] = useState('FULL_TIME');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Fetch departments from live DB
  useEffect(() => {
    async function loadDepts() {
      try {
        const res = await getDepartmentsApi();
        const list = res.data || res || [];
        setDepartmentsList(list);
        if (list.length > 0) {
          setSelectedDepartmentId(String(list[0].id));
        }
      } catch (err) {
        console.error('Failed to load departments', err);
      }
    }
    loadDepts();
  }, []);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const res = await getEmployeesApi({ search });
      const rawList = res.data || res || [];
      const formatted = rawList.map((emp) => ({
        id: emp.id,
        name: emp.first_name ? `${emp.first_name} ${emp.last_name || ''}`.trim() : (emp.name || 'Employee'),
        jobTitle: emp.job_position_title || emp.job_title || 'Team Member',
        department: emp.department_name || emp.department || 'General',
        workEmail: emp.email || emp.work_email || '',
        workPhone: emp.phone || emp.work_phone || '',
        employeeType: emp.employee_type || 'Full-time',
        avatarUrl: emp.avatar_url || `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80`,
        counts: {
          contracts: emp.contract_count || 1,
          attendance: emp.attendance_count || 0
        }
      }));
      setEmployees(formatted);
    } catch (err) {
      console.error('Failed to fetch employees', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [search]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!name.trim()) {
      setFormError('Please enter employee full name.');
      return;
    }
    if (!workEmail.trim()) {
      setFormError('Please enter a valid work email.');
      return;
    }

    setSaving(true);
    try {
      const nameParts = name.trim().split(' ');
      const firstName = nameParts[0] || name.trim();
      const lastName = nameParts.slice(1).join(' ') || 'Employee';

      const res = await createEmployeeApi({
        employee_code: `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
        first_name: firstName,
        last_name: lastName,
        email: workEmail.trim().toLowerCase(),
        phone: workPhone.trim() || null,
        job_title: jobTitle.trim() || 'Team Member',
        department_id: selectedDepartmentId ? parseInt(selectedDepartmentId, 10) : 1,
        employee_type: employeeType || 'FULL_TIME',
        employment_status: 'ACTIVE',
        wage: parseFloat(wage) || 35000,
        contract_wage: parseFloat(wage) || 35000,
        joining_date: new Date().toISOString().split('T')[0]
      });

      const newId = res.data?.id || res.id;
      setName('');
      setJobTitle('');
      setWorkEmail('');
      setWorkPhone('');
      setWage('35000');
      setEmployeeType('FULL_TIME');
      setFormError('');
      setIsModalOpen(false);
      await fetchEmployees();
      if (newId) {
        navigate(`/employees/${newId}`);
      }
    } catch (err) {
      console.error('Failed to create employee', err);
      const errMsg = err?.response?.data?.message || err.message || 'Failed to create employee';
      setFormError(errMsg);
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    {
      key: 'name',
      header: 'Employee Name',
      render: (val, row) => (
        <div className="flex items-center gap-3">
          <img
            src={row.avatarUrl}
            alt={val}
            className="w-8 h-8 rounded-full object-cover border border-border shrink-0"
          />
          <div>
            <span className="font-bold text-ink-900">{val}</span>
            <p className="text-xs text-ink-600">{row.workEmail}</p>
          </div>
        </div>
      ),
    },
    { key: 'jobTitle', header: 'Job Position' },
    { key: 'department', header: 'Department' },
    { key: 'workPhone', header: 'Work Phone' },
    {
      key: 'actions',
      header: 'Employment Contract',
      align: 'right',
      render: (val, row) => (
        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => navigate(`/employees/${row.id}/contracts`)}
            className="flex items-center gap-1.5 px-3 py-1 bg-[#C5A059]/15 hover:bg-[#C5A059] text-primary-600 hover:text-slate-950 rounded-sm font-bold text-xs border border-[#C5A059]/30 transition-all cursor-pointer"
            title={`Manage contracts for ${row.name}`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Contracts</span>
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Top Header & Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-ink-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-primary-600" />
            <span>Employees</span>
          </h1>
          <p className="text-xs text-ink-600 mt-1">
            Central employee directory — contracts, attendance, time off, and payroll hub
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Kanban / List Toggle */}
          <div className="flex items-center bg-surface border border-border rounded-[var(--radius-sm)] p-1">
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-1.5 rounded-xs text-xs font-semibold flex items-center gap-1 transition-colors ${
                viewMode === 'kanban'
                  ? 'bg-primary-600 text-white shadow-xs'
                  : 'text-ink-600 hover:text-ink-900'
              }`}
              title="Kanban View"
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="hidden md:inline">Kanban</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-xs text-xs font-semibold flex items-center gap-1 transition-colors ${
                viewMode === 'list'
                  ? 'bg-primary-600 text-white shadow-xs'
                  : 'text-ink-600 hover:text-ink-900'
              }`}
              title="List View"
            >
              <ListIcon className="w-4 h-4" />
              <span className="hidden md:inline">List</span>
            </button>
          </div>

          <Button
            variant="secondary"
            icon={FileText}
            onClick={() => navigate('/contracts')}
            className="text-xs"
          >
            Manage Contracts
          </Button>

          {canCreate && (
            <button
              type="button"
              onClick={() => {
                setFormError('');
                setIsModalOpen(true);
              }}
              className="inline-flex items-center justify-center gap-2 font-bold text-sm rounded-[var(--radius-sm)] h-9 px-4 bg-[#C5A059] hover:bg-[#b38e36] text-slate-950 shadow-md shadow-amber-500/20 active:scale-95 cursor-pointer transition-all shrink-0"
              title="Add a new employee to the organization"
            >
              <Plus className="w-4 h-4 text-slate-950 stroke-[3]" />
              <span>New Employee</span>
            </button>
          )}
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="w-full max-w-md relative">
        <Search className="w-4 h-4 text-ink-400 absolute left-3 top-3" />
        <input
          type="text"
          placeholder="Search employee name, title, department..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full h-10 pl-9 pr-4 text-sm bg-surface border border-border rounded-[var(--radius-sm)] focus-visible:outline-none"
        />
      </div>

      {/* View Rendering */}
      {viewMode === 'kanban' ? (
        <EmployeeKanbanView
          employees={employees}
          onSelect={(emp) => navigate(`/employees/${emp.id}`)}
        />
      ) : (
        <DataTable
          columns={columns}
          data={employees}
          onRowClick={(emp) => navigate(`/employees/${emp.id}`)}
          emptyMessage="No employees matched your criteria"
        />
      )}

      {/* New Employee Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setFormError('');
        }}
        title="Create New Employee"
        maxWidth="max-w-2xl"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setIsModalOpen(false);
                setFormError('');
              }}
              disabled={saving}
            >
              Cancel
            </Button>
            <button
              type="submit"
              form="create-employee-form"
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 font-bold text-sm rounded-[var(--radius-sm)] h-9 px-5 bg-[#C5A059] hover:bg-[#b38e36] text-slate-950 shadow-md shadow-amber-500/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-all"
            >
              {saving ? 'Creating Employee...' : 'Create Employee'}
            </button>
          </>
        }
      >
        <form id="create-employee-form" onSubmit={handleCreate} className="flex flex-col gap-4">
          {formError && (
            <div className="p-3 bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs rounded-sm font-medium flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Full Name *"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Rahul Sharma"
              required
            />
            <Input
              label="Job Position Title *"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="e.g. Senior Software Engineer"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Department *"
              value={selectedDepartmentId}
              onChange={(e) => setSelectedDepartmentId(e.target.value)}
              required
            >
              {departmentsList.length > 0 ? (
                departmentsList.map((d) => (
                  <option key={d.id} value={d.id} className="bg-surface text-ink-900">
                    {d.name} {d.code ? `(${d.code})` : ''}
                  </option>
                ))
              ) : (
                <option value="1" className="bg-surface text-ink-900">Engineering</option>
              )}
            </Select>

            <Select
              label="Employment Type"
              value={employeeType}
              onChange={(e) => setEmployeeType(e.target.value)}
            >
              <option value="FULL_TIME" className="bg-surface text-ink-900">Full-Time (Regular)</option>
              <option value="PART_TIME" className="bg-surface text-ink-900">Part-Time</option>
              <option value="CONTRACT" className="bg-surface text-ink-900">Contractor / Fixed-Term</option>
              <option value="INTERN" className="bg-surface text-ink-900">Internship</option>
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Work Email *"
              type="email"
              value={workEmail}
              onChange={(e) => setWorkEmail(e.target.value)}
              placeholder="rahul.sharma@company.com"
              required
            />
            <Input
              label="Work Phone"
              type="tel"
              value={workPhone}
              onChange={(e) => setWorkPhone(e.target.value)}
              placeholder="+91 98765 43210"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Monthly Base Wage (₹) *"
              type="number"
              min="0"
              step="500"
              value={wage}
              onChange={(e) => setWage(e.target.value)}
              placeholder="35000"
              required
            />
            <div className="flex flex-col justify-center text-xs text-ink-600 bg-surface-muted/50 p-3 rounded-[var(--radius-sm)] border border-border">
              <span className="font-semibold text-primary-600 mb-0.5">Automated Provisioning</span>
              <span>Automatically sets up active employment contract and standard leave allocations (20 PTO / 12 Sick).</span>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}

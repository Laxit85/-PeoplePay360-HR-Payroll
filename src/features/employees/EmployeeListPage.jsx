import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutGrid, List as ListIcon, Plus, Search, Users } from 'lucide-react';
import { getMockEmployees, createMockEmployee } from '../../mockApi/apiHandlers';
import { EmployeeKanbanView } from './EmployeeKanbanView';
import { DataTable } from '../../components/data/DataTable';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';
import { useAuth } from '../../auth/useAuth';

export function EmployeeListPage() {
  const navigate = useNavigate();
  const { can } = useAuth();
  const [viewMode, setViewMode] = useState('kanban'); // kanban | list
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [department, setDepartment] = useState('Engineering');
  const [workEmail, setWorkEmail] = useState('');
  const [workPhone, setWorkPhone] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const list = await getMockEmployees(search);
      setEmployees(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [search]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const created = await createMockEmployee({
        name,
        jobTitle,
        department,
        workEmail,
        workPhone,
        employeeType: 'Full-time',
        company: 'OXP Global Inc.',
      });
      setIsModalOpen(false);
      navigate(`/employees/${created.id}`);
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
      key: 'counts',
      header: 'Smart Records',
      render: (val) => (
        <div className="flex items-center gap-2 text-xs">
          <span className="px-2 py-0.5 rounded-pill bg-primary-50 text-primary-600 font-semibold">
            {val?.contracts || 0} Contracts
          </span>
          <span className="px-2 py-0.5 rounded-pill bg-surface-muted text-ink-600 font-medium">
            {val?.attendance || 0} Att.
          </span>
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

          {can('employees.create') && (
            <Button variant="primary" icon={Plus} onClick={() => setIsModalOpen(true)}>
              New Employee
            </Button>
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
        onClose={() => setIsModalOpen(false)}
        title="Create New Employee Record"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreate} disabled={saving}>
              {saving ? 'Creating...' : 'Create Employee'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <Input
            label="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Jane Doe"
            required
          />
          <Input
            label="Job Position Title"
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            placeholder="Senior Product Manager"
            required
          />
          <Select
            label="Department"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
          >
            <option value="Engineering">Engineering</option>
            <option value="Human Resources">Human Resources</option>
            <option value="Finance & Payroll">Finance & Payroll</option>
            <option value="Executive">Executive</option>
            <option value="Operations">Operations</option>
            <option value="Product">Product</option>
          </Select>
          <Input
            label="Work Email"
            type="email"
            value={workEmail}
            onChange={(e) => setWorkEmail(e.target.value)}
            placeholder="jane@oxp.com"
            required
          />
          <Input
            label="Work Phone"
            value={workPhone}
            onChange={(e) => setWorkPhone(e.target.value)}
            placeholder="+1 (555) 019-2288"
          />
        </form>
      </Modal>
    </div>
  );
}

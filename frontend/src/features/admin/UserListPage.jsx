import React, { useState, useEffect } from 'react';
import { Plus, UserCheck, Shield } from 'lucide-react';
import { getMockUsers, getMockEmployees, createMockUser } from '../../mockApi/apiHandlers';
import { DataTable } from '../../components/data/DataTable';
import { StatusBadge } from '../../components/data/StatusBadge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { ROLES } from '../../auth/permissions';

export function UserListPage() {
  const [users, setUsers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState(ROLES.EMPLOYEE);
  const [employeeId, setEmployeeId] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [uList, eList] = await Promise.all([getMockUsers(), getMockEmployees()]);
      setUsers(uList);
      setEmployees(eList);
      if (eList.length > 0) setEmployeeId(eList[0].id);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const emp = employees.find((x) => x.id === employeeId);
      await createMockUser({
        name: name || emp?.name || 'New User',
        email,
        role,
        employeeId,
        status: 'Active',
      });
      setIsModalOpen(false);
      setName('');
      setEmail('');
      fetchData();
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    {
      key: 'name',
      header: 'User Name',
      render: (val, row) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary-50 text-primary-600 font-bold text-xs flex items-center justify-center border border-primary-600/20">
            {val.charAt(0)}
          </div>
          <div>
            <span className="font-semibold text-ink-900">{val}</span>
          </div>
        </div>
      ),
    },
    { key: 'email', header: 'Work Email' },
    {
      key: 'role',
      header: 'Assigned Role',
      render: (val) => (
        <span className="px-2 py-0.5 rounded-pill bg-surface-muted border border-border text-xs font-semibold text-ink-900">
          {val}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Account Status',
      render: (val) => <StatusBadge status={val} />,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-ink-900 flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary-600" />
            <span>User Management</span>
          </h1>
          <p className="text-xs text-ink-600 mt-1">
            Admin access control: Create and manage user accounts linked to Employee records
          </p>
        </div>
        <Button variant="primary" icon={Plus} onClick={() => setIsModalOpen(true)}>
          Create User
        </Button>
      </div>

      <DataTable columns={columns} data={users} emptyMessage="No user accounts defined" />

      {/* Create User Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create New User Account"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreateUser} disabled={saving}>
              {saving ? 'Creating...' : 'Create Account'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateUser} className="flex flex-col gap-4">
          <Select
            label="Linked Employee Record"
            value={employeeId}
            onChange={(e) => {
              setEmployeeId(e.target.value);
              const emp = employees.find((x) => x.id === e.target.value);
              if (emp) {
                setName(emp.name);
                setEmail(emp.workEmail);
              }
            }}
          >
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.name} ({emp.department} - {emp.jobTitle})
              </option>
            ))}
          </Select>

          <Input
            label="User Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <Input
            label="Work Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <Select
            label="Role Assignment"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            {Object.values(ROLES).map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </Select>
        </form>
      </Modal>
    </div>
  );
}

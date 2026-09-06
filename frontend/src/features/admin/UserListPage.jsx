import React, { useState, useEffect } from 'react';
import { Plus, UserCheck, Shield, Power } from 'lucide-react';
import { getUsersApi, createUserApi, toggleUserStatusApi } from '../../api';
import { DataTable } from '../../components/data/DataTable';
import { StatusBadge } from '../../components/data/StatusBadge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { ROLES } from '../../auth/permissions';

export function UserListPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form state - strictly Employee Name, Login Email, and Role
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState(ROLES.EMPLOYEE);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const uRes = await getUsersApi().catch(() => ({ data: [] }));
      const uList = uRes?.data || uRes || [];
      setUsers(uList);
    } catch (err) {
      console.error('Failed to fetch user accounts', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateUser = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setFormError('');

    if (!name.trim()) {
      setFormError('Please enter the employee name.');
      return;
    }
    if (!email.trim()) {
      setFormError('Please enter a login email.');
      return;
    }

    setSaving(true);
    try {
      await createUserApi({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        role: role || ROLES.EMPLOYEE,
        password: 'password123',
      });
      setIsModalOpen(false);
      setName('');
      setEmail('');
      setRole(ROLES.EMPLOYEE);
      setFormError('');
      await fetchData();
    } catch (err) {
      console.error('Failed to create user account', err);
      const msg = err?.response?.data?.message || err.message || 'Failed to create user account';
      setFormError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (user) => {
    try {
      await toggleUserStatusApi(user.id);
      await fetchData();
    } catch (err) {
      alert(err?.response?.data?.message || err.message || 'Failed to update user status');
    }
  };

  const columns = [
    {
      key: 'name',
      header: 'Employee Name',
      render: (val, row) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary-50 text-primary-600 font-bold text-xs flex items-center justify-center border border-primary-600/20">
            {(val || row.email || 'U').charAt(0).toUpperCase()}
          </div>
          <div>
            <span className="font-semibold text-ink-900">{val || row.email}</span>
            {row.employeeCode && (
              <span className="text-[10px] text-ink-400 block">{row.employeeCode}</span>
            )}
          </div>
        </div>
      ),
    },
    { key: 'email', header: 'Login Email' },
    {
      key: 'role',
      header: 'Role',
      render: (val) => (
        <span className="px-2 py-0.5 rounded-pill bg-primary-600/10 text-primary-600 border border-primary-600/20 text-xs font-bold">
          {val}
        </span>
      ),
    },
    {
      key: 'department',
      header: 'Department',
      render: (val) => <span className="text-xs text-ink-600">{val || 'General'}</span>,
    },
    {
      key: 'status',
      header: 'Account Status',
      render: (val, row) => (
        <div className="flex items-center gap-2">
          <StatusBadge status={row.is_active ? 'Active' : 'Inactive'} />
          <button
            onClick={() => handleToggleStatus(row)}
            title={row.is_active ? 'Deactivate account' : 'Activate account'}
            className="p-1 rounded text-ink-400 hover:text-ink-900 hover:bg-surface-muted transition-colors"
          >
            <Power className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-ink-900 flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary-600" />
            <span>Admin User Management & Roles</span>
          </h1>
          <p className="text-xs text-ink-600 mt-1">
            Create, manage and assign RBAC access roles across PeoplePay360
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setFormError('');
            setIsModalOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 font-bold text-sm rounded-[var(--radius-sm)] h-9 px-4 bg-[#C5A059] hover:bg-[#b38e36] text-slate-950 shadow-md shadow-amber-500/20 active:scale-95 cursor-pointer transition-all"
        >
          <Plus className="w-4 h-4 text-slate-950 stroke-[3]" />
          <span>Create User</span>
        </button>
      </div>

      <DataTable
        columns={columns}
        data={users}
        loading={loading}
        emptyMessage="No user accounts defined in the database"
      />

      {/* Create User Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setFormError('');
        }}
        title="Create New User"
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
              form="create-user-form"
              onClick={handleCreateUser}
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 font-bold text-sm rounded-[var(--radius-sm)] h-9 px-5 bg-[#C5A059] hover:bg-[#b38e36] text-slate-950 shadow-md shadow-amber-500/20 active:scale-95 disabled:opacity-50 cursor-pointer transition-all"
            >
              {saving ? 'Creating Account...' : 'Create User'}
            </button>
          </>
        }
      >
        <form id="create-user-form" onSubmit={handleCreateUser} className="flex flex-col gap-4">
          {formError && (
            <div className="p-3 bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs rounded-sm font-medium">
              {formError}
            </div>
          )}

          <Input
            label="Employee Name *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Rahul Sharma"
            required
          />

          <Input
            label="Login Email *"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="e.g. rahul.sharma@peoplepay360.internal"
            required
          />

          <Select
            label="Role *"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            required
          >
            {Object.values(ROLES).map((r) => (
              <option key={r} value={r} className="bg-surface text-ink-900">
                {r}
              </option>
            ))}
          </Select>

          <div className="p-3 bg-surface-muted rounded-sm text-xs text-ink-600 border border-border">
            <strong>Default Password:</strong> <code className="text-primary-600 font-mono">password123</code> (User can log in immediately after creation)
          </div>
        </form>
      </Modal>
    </div>
  );
}

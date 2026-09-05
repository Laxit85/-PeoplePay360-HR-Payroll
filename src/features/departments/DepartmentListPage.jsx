import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Building2,
  Plus,
  Edit2,
  Trash2,
  Users,
  CheckCircle2,
  Search,
  Filter,
  ChevronDown,
  ListFilter,
  FolderCheck,
} from 'lucide-react';
import {
  getMockDepartments,
  saveMockDepartment,
  deleteMockDepartment,
  getMockEmployees,
} from '../../mockApi/apiHandlers';
import { DataTable } from '../../components/data/DataTable';
import { StatusBadge } from '../../components/data/StatusBadge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { useAuth } from '../../auth/useAuth';

export function DepartmentListPage() {
  const { can } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Top Action Popup Dropdown Menu
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const actionMenuRef = useRef(null);

  // Add / Edit Form Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDept, setSelectedDept] = useState(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [managerName, setManagerName] = useState('');
  const [company, setCompany] = useState('OXP Global India Pvt Ltd');
  const [status, setStatus] = useState('Active');
  const [saving, setSaving] = useState(false);

  // Delete Confirmation Modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deptToDelete, setDeptToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Quick Selector Modals (for header popup actions "Edit Department" & "Delete Department")
  const [isEditSelectorOpen, setIsEditSelectorOpen] = useState(false);
  const [editSelectedId, setEditSelectedId] = useState('');

  const [isDeleteSelectorOpen, setIsDeleteSelectorOpen] = useState(false);
  const [deleteSelectedId, setDeleteSelectedId] = useState('');

  const fetchDepartments = async () => {
    setLoading(true);
    try {
      const [deptList, empList] = await Promise.all([
        getMockDepartments(),
        getMockEmployees(),
      ]);
      setDepartments(deptList);
      setEmployees(empList);
      if (deptList.length > 0) {
        setEditSelectedId(deptList[0].id);
        setDeleteSelectedId(deptList[0].id);
      }
    } catch (err) {
      console.error('Error loading departments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  // Handle URL Action Parameters (?action=add, ?action=edit, ?action=delete)
  useEffect(() => {
    const action = searchParams.get('action');
    if (!action) return;

    if (action === 'add') {
      handleOpenNew();
    } else if (action === 'edit') {
      setIsEditSelectorOpen(true);
    } else if (action === 'delete') {
      setIsDeleteSelectorOpen(true);
    }

    // Clear URL param after opening popup modal
    setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams]);

  // Click outside for header popup menu
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(e.target)) {
        setActionMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleOpenNew = () => {
    setSelectedDept(null);
    setName('');
    setCode('');
    setManagerName(employees.length > 0 ? employees[0].name : '');
    setCompany('OXP Global India Pvt Ltd');
    setStatus('Active');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (dept) => {
    setSelectedDept(dept);
    setName(dept.name || '');
    setCode(dept.code || '');
    setManagerName(dept.managerName || '');
    setCompany(dept.company || 'OXP Global India Pvt Ltd');
    setStatus(dept.status || 'Active');
    setIsModalOpen(true);
  };

  const handleOpenDelete = (dept) => {
    setDeptToDelete(dept);
    setIsDeleteModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) return;

    setSaving(true);
    try {
      await saveMockDepartment({
        id: selectedDept?.id,
        name: name.trim(),
        code: code.trim().toUpperCase(),
        managerName: managerName.trim(),
        company: company.trim(),
        status,
      });
      setIsModalOpen(false);
      fetchDepartments();
    } catch (err) {
      console.error('Error saving department:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deptToDelete) return;
    setDeleting(true);
    try {
      await deleteMockDepartment(deptToDelete.id);
      setIsDeleteModalOpen(false);
      setDeptToDelete(null);
      fetchDepartments();
    } catch (err) {
      console.error('Error deleting department:', err);
    } finally {
      setDeleting(false);
    }
  };

  // Filtered List
  const filteredDepartments = departments.filter((d) => {
    const matchesSearch =
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.managerName && d.managerName.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === 'All' || d.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // KPI Calculations
  const totalDepts = departments.length;
  const activeDepts = departments.filter((d) => d.status === 'Active').length;
  const totalHeadcount = departments.reduce((acc, d) => acc + (d.headcount || 0), 0);
  const avgHeadcount = totalDepts > 0 ? (totalHeadcount / totalDepts).toFixed(1) : 0;

  const columns = [
    {
      key: 'name',
      header: 'Department',
      render: (val, row) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-sm bg-primary-600/10 text-primary-600 font-bold text-xs flex items-center justify-center border border-primary-600/20 shrink-0">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-ink-900 flex items-center gap-2">
              <span>{val}</span>
              <span className="px-1.5 py-0.5 rounded bg-surface-muted text-[10px] font-mono font-bold text-primary-600 border border-primary-600/30">
                {row.code}
              </span>
            </div>
            <div className="text-[11px] text-ink-400">{row.company || 'OXP Global India Pvt Ltd'}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'managerName',
      header: 'Department Manager',
      render: (val) => (
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-primary-600/20 text-primary-600 text-[10px] font-bold flex items-center justify-center border border-primary-600/30 shrink-0">
            {val ? val.charAt(0) : 'M'}
          </div>
          <span className="font-medium text-xs text-ink-900">{val || 'Unassigned'}</span>
        </div>
      ),
    },
    {
      key: 'headcount',
      header: 'Employees Count',
      align: 'center',
      render: (val) => (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-pill bg-primary-600/10 border border-primary-600/20 text-xs font-bold text-primary-600">
          <Users className="w-3.5 h-3.5" />
          <span>{val || 0} {val === 1 ? 'Employee' : 'Employees'}</span>
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      render: (val) => <StatusBadge status={val || 'Active'} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'center',
      render: (_, row) => (
        <div className="flex items-center justify-center gap-2" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => handleOpenEdit(row)}
            title="Edit Department"
            className="p-1.5 text-ink-600 hover:text-primary-600 hover:bg-surface-muted rounded-sm transition-colors border border-transparent hover:border-border flex items-center gap-1 text-xs font-semibold"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Edit</span>
          </button>
          <button
            onClick={() => handleOpenDelete(row)}
            title="Delete Department"
            className="p-1.5 text-ink-600 hover:text-danger-600 hover:bg-danger-500/10 rounded-sm transition-colors border border-transparent hover:border-danger-500/20 flex items-center gap-1 text-xs font-semibold"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Delete</span>
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Header & Main Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-ink-900 flex items-center gap-2.5">
            <Building2 className="w-7 h-7 text-primary-600" />
            <span>Departments Management</span>
          </h1>
          <p className="text-xs text-ink-600 mt-1">
            Manage organizational departments: View existing departments, add, edit, and delete department records.
          </p>
        </div>

        {/* Header Action Buttons & Popup Dropdown */}
        <div className="flex items-center gap-2">
          {/* Department Quick Actions Popup Menu Button */}
          <div className="relative" ref={actionMenuRef}>
            <button
              onClick={() => setActionMenuOpen(!actionMenuOpen)}
              className="px-3 py-2 bg-surface-muted text-ink-900 border border-border-strong rounded-sm text-xs font-bold hover:bg-surface transition-colors flex items-center gap-2 shadow-sm"
            >
              <ListFilter className="w-4 h-4 text-primary-600" />
              <span>Department Actions</span>
              <ChevronDown className="w-3.5 h-3.5 text-ink-600" />
            </button>

            {actionMenuOpen && (
              <div className="absolute right-0 mt-1 w-56 bg-surface border border-border-strong rounded-sm shadow-modal py-1 z-50 animate-in fade-in duration-100">
                <button
                  onClick={() => {
                    setActionMenuOpen(false);
                    setSearchQuery('');
                    setStatusFilter('All');
                  }}
                  className="w-full text-left px-4 py-2 text-xs font-semibold text-ink-900 hover:bg-surface-muted hover:text-primary-600 flex items-center gap-2"
                >
                  <FolderCheck className="w-3.5 h-3.5 text-primary-600" />
                  <span>Already Existing Departments</span>
                </button>
                {can('departments.manage') && (
                  <>
                    <button
                      onClick={() => {
                        setActionMenuOpen(false);
                        handleOpenNew();
                      }}
                      className="w-full text-left px-4 py-2 text-xs font-semibold text-ink-900 hover:bg-surface-muted hover:text-primary-600 flex items-center gap-2"
                    >
                      <Plus className="w-3.5 h-3.5 text-primary-600" />
                      <span>Add Department</span>
                    </button>
                    <button
                      onClick={() => {
                        setActionMenuOpen(false);
                        setIsEditSelectorOpen(true);
                      }}
                      className="w-full text-left px-4 py-2 text-xs font-semibold text-ink-900 hover:bg-surface-muted hover:text-primary-600 flex items-center gap-2"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-primary-600" />
                      <span>Edit Department</span>
                    </button>
                    <button
                      onClick={() => {
                        setActionMenuOpen(false);
                        setIsDeleteSelectorOpen(true);
                      }}
                      className="w-full text-left px-4 py-2 text-xs font-semibold text-danger-400 hover:bg-danger-500/10 flex items-center gap-2"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-danger-400" />
                      <span>Delete Department</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Primary Quick Add Button */}
          {can('departments.manage') && (
            <Button variant="primary" icon={Plus} onClick={handleOpenNew}>
              Add Department
            </Button>
          )}
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-sm bg-surface border border-border flex items-center justify-between shadow-card">
          <div>
            <div className="text-xs font-medium text-ink-600">Total Departments</div>
            <div className="text-2xl font-black font-display text-ink-900 mt-1">{totalDepts}</div>
          </div>
          <div className="w-10 h-10 rounded-sm bg-primary-600/10 border border-primary-600/20 flex items-center justify-center text-primary-600">
            <Building2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-sm bg-surface border border-border flex items-center justify-between shadow-card">
          <div>
            <div className="text-xs font-medium text-ink-600">Active Departments</div>
            <div className="text-2xl font-black font-display text-primary-600 mt-1">{activeDepts}</div>
          </div>
          <div className="w-10 h-10 rounded-sm bg-success-500/10 border border-success-500/20 flex items-center justify-center text-success-600">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-sm bg-surface border border-border flex items-center justify-between shadow-card">
          <div>
            <div className="text-xs font-medium text-ink-600">Total Assigned Headcount</div>
            <div className="text-2xl font-black font-display text-ink-900 mt-1">{totalHeadcount}</div>
          </div>
          <div className="w-10 h-10 rounded-sm bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-sm bg-surface border border-border flex items-center justify-between shadow-card">
          <div>
            <div className="text-xs font-medium text-ink-600">Avg Headcount / Dept</div>
            <div className="text-2xl font-black font-display text-ink-900 mt-1">{avgHeadcount}</div>
          </div>
          <div className="w-10 h-10 rounded-sm bg-surface-muted border border-border-strong flex items-center justify-center text-ink-600">
            <Users className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-3 bg-surface border border-border rounded-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-ink-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search departments, code, or manager..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface-muted text-ink-900 placeholder:text-ink-400 text-xs rounded-sm pl-9 pr-3 py-2 border border-border-strong focus:outline-none focus:border-primary-600 transition-colors"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-2 text-xs text-ink-600">
            <Filter className="w-3.5 h-3.5" />
            <span>Status:</span>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-surface-muted text-ink-900 text-xs rounded-sm px-3 py-2 border border-border-strong focus:outline-none focus:border-primary-600 transition-colors cursor-pointer"
          >
            <option value="All">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Departments Data Table */}
      <DataTable
        columns={columns}
        data={filteredDepartments}
        loading={loading}
        emptyMessage="No departments found matching your criteria"
      />

      {/* Add / Edit Department Form Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedDept ? 'Edit Department Details' : 'Add New Department'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : selectedDept ? 'Update Department' : 'Create Department'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Department Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Engineering"
              required
            />
            <Input
              label="Department Code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. ENG"
              required
            />
          </div>

          <Select
            label="Department Manager"
            value={managerName}
            onChange={(e) => setManagerName(e.target.value)}
          >
            <option value="">-- Unassigned --</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.name}>
                {emp.name} ({emp.jobTitle})
              </option>
            ))}
          </Select>

          <Input
            label="Company Name"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="OXP Global India Pvt Ltd"
            required
          />

          <Select
            label="Department Status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </Select>
        </form>
      </Modal>

      {/* Edit Department Popup Selector Modal */}
      <Modal
        isOpen={isEditSelectorOpen}
        onClose={() => setIsEditSelectorOpen(false)}
        title="Select Department to Edit"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsEditSelectorOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                const dept = departments.find((d) => d.id === editSelectedId);
                if (dept) {
                  setIsEditSelectorOpen(false);
                  handleOpenEdit(dept);
                }
              }}
              disabled={!editSelectedId}
            >
              Proceed to Edit
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <p className="text-xs text-ink-600">
            Choose an existing department from the list below to update its code, manager, company, or active status:
          </p>
          <Select
            label="Select Existing Department"
            value={editSelectedId}
            onChange={(e) => setEditSelectedId(e.target.value)}
          >
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.code}) — Managed by {d.managerName || 'Unassigned'}
              </option>
            ))}
          </Select>
        </div>
      </Modal>

      {/* Delete Department Popup Selector Modal */}
      <Modal
        isOpen={isDeleteSelectorOpen}
        onClose={() => setIsDeleteSelectorOpen(false)}
        title="Select Department to Delete"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsDeleteSelectorOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                const dept = departments.find((d) => d.id === deleteSelectedId);
                if (dept) {
                  setIsDeleteSelectorOpen(false);
                  handleOpenDelete(dept);
                }
              }}
              disabled={!deleteSelectedId}
            >
              Proceed to Delete
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <p className="text-xs text-ink-600">
            Choose an existing department to remove from the organization:
          </p>
          <Select
            label="Select Existing Department"
            value={deleteSelectedId}
            onChange={(e) => setDeleteSelectedId(e.target.value)}
          >
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.code}) — {d.headcount || 0} Employees
              </option>
            ))}
          </Select>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Confirm Department Deletion"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? 'Deleting...' : 'Delete Department'}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3 py-2">
          <p className="text-sm text-ink-900 font-semibold">
            Are you sure you want to delete department <span className="text-primary-600">"{deptToDelete?.name}"</span> ({deptToDelete?.code})?
          </p>
          <p className="text-xs text-ink-600 bg-danger-500/10 border border-danger-500/20 p-3 rounded-sm text-danger-400">
            <strong>Warning:</strong> Deleting a department will remove its entry from organizational structures. Existing employees assigned to this department will retain their record, but may need to be reallocated to another department.
          </p>
        </div>
      </Modal>
    </div>
  );
}

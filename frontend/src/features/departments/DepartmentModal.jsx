import React, { useState, useEffect } from 'react';
import {
  Building2,
  Plus,
  Edit2,
  Trash2,
  Users,
  CheckCircle2,
  Search,
  ArrowLeft,
  AlertTriangle,
  FolderCheck,
} from 'lucide-react';
import {
  getMockDepartments,
  saveMockDepartment,
  deleteMockDepartment,
  getMockEmployees,
} from '../../mockApi/apiHandlers';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { StatusBadge } from '../../components/data/StatusBadge';

export function DepartmentModal({ isOpen, onClose, initialTab = 'list' }) {
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState(initialTab); // 'list' | 'add' | 'edit' | 'delete_confirm'

  // Form State
  const [selectedDept, setSelectedDept] = useState(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [managerName, setManagerName] = useState('');
  const [company, setCompany] = useState('OXP Global India Pvt Ltd');
  const [status, setStatus] = useState('Active');
  const [saving, setSaving] = useState(false);

  // Delete State
  const [deptToDelete, setDeptToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchDepartments = async () => {
    setLoading(true);
    try {
      const [deptList, empList] = await Promise.all([
        getMockDepartments(),
        getMockEmployees(),
      ]);
      setDepartments(deptList);
      setEmployees(empList);
    } catch (err) {
      console.error('Error fetching departments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchDepartments();
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  const handleOpenAdd = () => {
    setSelectedDept(null);
    setName('');
    setCode('');
    setManagerName(employees.length > 0 ? employees[0].name : '');
    setCompany('OXP Global India Pvt Ltd');
    setStatus('Active');
    setActiveTab('add');
  };

  const handleOpenEdit = (dept) => {
    setSelectedDept(dept);
    setName(dept.name || '');
    setCode(dept.code || '');
    setManagerName(dept.managerName || '');
    setCompany(dept.company || 'OXP Global India Pvt Ltd');
    setStatus(dept.status || 'Active');
    setActiveTab('edit');
  };

  const handleOpenDelete = (dept) => {
    setDeptToDelete(dept);
    setActiveTab('delete_confirm');
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
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
      await fetchDepartments();
      setActiveTab('list');
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
      await fetchDepartments();
      setDeptToDelete(null);
      setActiveTab('list');
    } catch (err) {
      console.error('Error deleting department:', err);
    } finally {
      setDeleting(false);
    }
  };

  const filteredDepartments = departments.filter(
    (d) =>
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.managerName && d.managerName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-sm bg-primary-600/20 text-primary-600 flex items-center justify-center border border-primary-600/30">
            <Building2 className="w-4.5 h-4.5" />
          </div>
          <div>
            <div className="text-base font-bold text-ink-900 font-display">Department Management</div>
            <div className="text-[11px] font-normal text-ink-600">
              {activeTab === 'list' && 'Already existing departments directory & quick actions'}
              {activeTab === 'add' && 'Create a new organizational department'}
              {activeTab === 'edit' && `Editing department details for ${selectedDept?.name || ''}`}
              {activeTab === 'delete_confirm' && `Confirm deletion of ${deptToDelete?.name || ''}`}
            </div>
          </div>
        </div>
      }
      footer={
        activeTab === 'list' ? (
          <div className="flex items-center justify-between w-full">
            <div className="text-xs text-ink-600 font-semibold">
              Total: {departments.length} {departments.length === 1 ? 'Department' : 'Departments'}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={onClose}>
                Close
              </Button>
              <Button variant="primary" icon={Plus} onClick={handleOpenAdd}>
                Add Department
              </Button>
            </div>
          </div>
        ) : activeTab === 'add' || activeTab === 'edit' ? (
          <>
            <Button variant="secondary" onClick={() => setActiveTab('list')}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : activeTab === 'edit' ? 'Update Department' : 'Create Department'}
            </Button>
          </>
        ) : (
          <>
            <Button variant="secondary" onClick={() => setActiveTab('list')}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete Department'}
            </Button>
          </>
        )
      }
    >
      {/* Navigation Bar inside Popup Modal */}
      <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
        <div className="flex items-center gap-2">
          {activeTab !== 'list' && (
            <button
              onClick={() => setActiveTab('list')}
              className="p-1 rounded text-ink-600 hover:text-ink-900 hover:bg-surface-muted transition-colors mr-1"
              title="Back to departments list"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => setActiveTab('list')}
            className={`px-3 py-1.5 rounded-sm text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'list'
                ? 'bg-primary-600/20 text-primary-600 border border-primary-600/30'
                : 'text-ink-600 hover:text-ink-900 bg-surface-muted hover:bg-surface'
            }`}
          >
            <FolderCheck className="w-3.5 h-3.5" />
            <span>Already Existing Departments ({departments.length})</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className={`px-3 py-1.5 rounded-sm text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'add'
                ? 'bg-primary-600/20 text-primary-600 border border-primary-600/30'
                : 'text-ink-600 hover:text-ink-900 bg-surface-muted hover:bg-surface'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Department</span>
          </button>
        </div>
      </div>

      {/* TAB 1: LIST ALREADY EXISTING DEPARTMENTS */}
      {activeTab === 'list' && (
        <div className="flex flex-col gap-4">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-ink-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search departments by name, code, or manager..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-surface-muted text-ink-900 placeholder:text-ink-400 text-xs rounded-sm pl-9 pr-3 py-2 border border-border-strong focus:outline-none focus:border-primary-600 transition-colors"
            />
          </div>

          {/* Departments Directory Cards / List */}
          {loading ? (
            <div className="py-8 text-center text-xs text-ink-600">Loading departments...</div>
          ) : filteredDepartments.length === 0 ? (
            <div className="py-8 text-center text-xs text-ink-600 bg-surface-muted rounded-sm border border-border">
              No departments found matching your search.
            </div>
          ) : (
            <div className="max-h-[380px] overflow-y-auto pr-1 flex flex-col gap-2.5">
              {filteredDepartments.map((dept) => (
                <div
                  key={dept.id}
                  className="p-3 bg-surface border border-border rounded-sm hover:border-primary-600/40 transition-colors flex items-center justify-between gap-3 shadow-card"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-sm bg-primary-600/10 text-primary-600 font-bold text-xs flex items-center justify-center border border-primary-600/20 shrink-0">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-ink-900 text-xs truncate">{dept.name}</span>
                        <span className="px-1.5 py-0.5 rounded bg-surface-muted text-[10px] font-mono font-bold text-primary-600 border border-primary-600/30">
                          {dept.code}
                        </span>
                        <StatusBadge status={dept.status || 'Active'} />
                      </div>
                      <div className="text-[11px] text-ink-400 mt-0.5 flex items-center gap-3">
                        <span>Manager: <strong className="text-ink-600">{dept.managerName || 'Unassigned'}</strong></span>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-primary-600 font-semibold">
                          <Users className="w-3 h-3" />
                          {dept.headcount || 0} {dept.headcount === 1 ? 'Employee' : 'Employees'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons for each department inside Popup */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleOpenEdit(dept)}
                      className="px-2.5 py-1.5 bg-surface-muted text-ink-900 hover:text-primary-600 hover:bg-primary-600/10 rounded-sm text-xs font-semibold border border-border transition-colors flex items-center gap-1"
                      title="Edit Department"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => handleOpenDelete(dept)}
                      className="px-2.5 py-1.5 bg-surface-muted text-ink-600 hover:text-danger-400 hover:bg-danger-500/10 rounded-sm text-xs font-semibold border border-border transition-colors flex items-center gap-1"
                      title="Delete Department"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2 & 3: ADD / EDIT DEPARTMENT FORM */}
      {(activeTab === 'add' || activeTab === 'edit') && (
        <form onSubmit={handleSave} className="flex flex-col gap-4 py-1">
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
      )}

      {/* TAB 4: DELETE CONFIRMATION */}
      {activeTab === 'delete_confirm' && (
        <div className="flex flex-col gap-3 py-2">
          <div className="flex items-center gap-3 p-3 bg-danger-500/10 border border-danger-500/20 rounded-sm">
            <AlertTriangle className="w-6 h-6 text-danger-400 shrink-0" />
            <div>
              <div className="text-xs font-bold text-danger-400">Confirm Deletion</div>
              <div className="text-xs text-ink-900 mt-0.5">
                Are you sure you want to delete department <strong className="text-primary-600">"{deptToDelete?.name}"</strong> ({deptToDelete?.code})?
              </div>
            </div>
          </div>
          <p className="text-xs text-ink-600 leading-relaxed">
            Deleting a department removes its entry from organizational structures. Existing employees assigned to this department will remain unaffected, but may need to be reallocated.
          </p>
        </div>
      )}
    </Modal>
  );
}

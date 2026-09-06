import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Plus,
  FileText,
  ArrowLeft,
  AlertCircle,
  Edit2,
  Trash2,
  CheckCircle2,
  Filter,
  User,
  Building,
  Briefcase
} from 'lucide-react';
import {
  getContractsApi,
  createContractApi,
  updateContractApi,
  deleteContractApi,
  getEmployeesApi,
  getSalaryStructuresApi,
  getSchedulesApi
} from '../../api';
import { DataTable } from '../../components/data/DataTable';
import { StatusBadge } from '../../components/data/StatusBadge';
import { CurrencyCell } from '../../components/data/CurrencyCell';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { formatDate } from '../../lib/format';
import { useAuth } from '../../auth/useAuth';

export function ContractListPanel() {
  const { id: paramEmployeeId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, can } = useAuth();

  // Data lists
  const [contracts, setContracts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [structures, setStructures] = useState([]);

  // Filtering state
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(paramEmployeeId || '');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [loading, setLoading] = useState(true);

  // Modal form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState(null);
  const [lockedEmployee, setLockedEmployee] = useState(null);
  const [conflictContract, setConflictContract] = useState(null);
  const [formEmployeeId, setFormEmployeeId] = useState('');
  const [referenceName, setReferenceName] = useState('');
  const [salaryStructureId, setSalaryStructureId] = useState('');
  const [workingScheduleId, setWorkingScheduleId] = useState('');
  const [wage, setWage] = useState(8000);
  const [wageType, setWageType] = useState('MONTHLY');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState('ACTIVE');
  const [errorMessage, setErrorMessage] = useState('');
  const [saving, setSaving] = useState(false);

  // Sync paramEmployeeId if user navigates between routes
  useEffect(() => {
    if (paramEmployeeId) {
      setSelectedEmployeeId(paramEmployeeId);
    }
  }, [paramEmployeeId]);

  // Initial master data fetch
  const fetchMasterData = async () => {
    try {
      const [empRes, schRes, strRes] = await Promise.all([
        getEmployeesApi().catch(() => ({ data: [] })),
        getSchedulesApi().catch(() => ({ data: [] })),
        getSalaryStructuresApi().catch(() => ({ data: [] }))
      ]);

      const empList = empRes?.data || empRes || [];
      const schList = schRes?.data || schRes || [];
      const strList = strRes?.data || strRes || [];

      setEmployees(empList);
      setSchedules(schList);
      setStructures(strList);

      if (schList.length && !workingScheduleId) setWorkingScheduleId(schList[0].id);
      if (strList.length && !salaryStructureId) setSalaryStructureId(strList[0].id);
    } catch (err) {
      console.error('Failed to load master data', err);
    }
  };

  // Contracts fetch
  const fetchContracts = async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedEmployeeId) params.employee_id = selectedEmployeeId;
      if (selectedStatus) params.status = selectedStatus;

      const res = await getContractsApi(params);
      const data = res?.data || res || [];
      setContracts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch contracts', err);
      setContracts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMasterData();
  }, []);

  useEffect(() => {
    fetchContracts();
  }, [selectedEmployeeId, selectedStatus]);

  // Open modal for new contract
  const handleOpenNew = (defaultEmpId = null) => {
    setSelectedContract(null);
    const targetEmpId = defaultEmpId || selectedEmployeeId || paramEmployeeId || '';
    setFormEmployeeId(targetEmpId);

    const empObj = employees.find(e => String(e.id) === String(targetEmpId));
    if (empObj) {
      setLockedEmployee(empObj);
      setReferenceName(`${empObj.first_name} ${empObj.last_name} - ${new Date().getFullYear()} Employment Agreement`);
      const targetWage = parseFloat(empObj.wage || empObj.contract_wage || 0);
      setWage(targetWage > 0 ? targetWage : 7500);
      if (empObj.contract_structure_id) setSalaryStructureId(empObj.contract_structure_id);
      if (empObj.working_schedule_id) setWorkingScheduleId(empObj.working_schedule_id);
    } else {
      setLockedEmployee(null);
      setReferenceName(`Employment Agreement - ${new Date().getFullYear()}`);
      setWage(7500);
    }

    setWageType('MONTHLY');
    setStartDate(new Date().toISOString().split('T')[0]);
    setEndDate('');
    setStatus('ACTIVE');
    if (schedules.length && (!empObj || !empObj.working_schedule_id)) setWorkingScheduleId(schedules[0].id);
    if (structures.length && (!empObj || !empObj.contract_structure_id)) setSalaryStructureId(structures[0].id);
    setErrorMessage('');
    setConflictContract(null);
    setIsModalOpen(true);
  };

  // Open modal for editing
  const handleOpenEdit = (c) => {
    setSelectedContract(c);
    setFormEmployeeId(c.employee_id);
    const empObj = employees.find(e => String(e.id) === String(c.employee_id)) || {
      id: c.employee_id,
      first_name: c.first_name,
      last_name: c.last_name,
      employee_code: c.employee_code,
      department_name: c.department_name,
      job_position_title: c.job_position_title
    };
    setLockedEmployee(empObj);
    setReferenceName(c.reference_name || '');
    setSalaryStructureId(c.salary_structure_id || (structures[0]?.id || ''));
    setWorkingScheduleId(c.working_schedule_id || (schedules[0]?.id || ''));
    setWage(c.wage || 0);
    setWageType(c.wage_type || 'MONTHLY');
    setStartDate(c.start_date ? String(c.start_date).split('T')[0] : '');
    setEndDate(c.end_date ? String(c.end_date).split('T')[0] : '');
    setStatus(c.status || 'ACTIVE');
    setErrorMessage('');
    setConflictContract(null);
    setIsModalOpen(true);
  };

  // Handle employee selection in the form (only used when employee is not locked)
  const handleFormEmployeeChange = (empId) => {
    setFormEmployeeId(empId);
    const empObj = employees.find(e => String(e.id) === String(empId));
    if (empObj && !selectedContract) {
      setReferenceName(`${empObj.first_name} ${empObj.last_name} - ${new Date().getFullYear()} Employment Agreement`);
      const targetWage = parseFloat(empObj.wage || empObj.contract_wage || 0);
      setWage(targetWage > 0 ? targetWage : 7500);
      if (empObj.contract_structure_id) setSalaryStructureId(empObj.contract_structure_id);
      if (empObj.working_schedule_id) setWorkingScheduleId(empObj.working_schedule_id);
    }
  };

  // Save contract (Create or Update)
  const handleSave = async (e, replaceActive = false) => {
    if (e && e.preventDefault) e.preventDefault();
    setErrorMessage('');
    setConflictContract(null);

    const empId = lockedEmployee?.id || formEmployeeId || selectedEmployeeId || paramEmployeeId;
    if (!empId) {
      setErrorMessage('Please select an employee for this contract.');
      return;
    }

    const empObj = lockedEmployee || employees.find(x => String(x.id) === String(empId));
    const empName = empObj ? `${empObj.first_name} ${empObj.last_name || ''}`.trim() : 'Employee';
    const finalRef = (referenceName && referenceName.trim()) || `${empName} - Employment Agreement`;

    const finalStructureId = Number(salaryStructureId) || structures[0]?.id || 1;
    const finalScheduleId = workingScheduleId ? Number(workingScheduleId) : (schedules[0]?.id || 1);

    const cleanWage = parseFloat(String(wage).replace(/[^0-9.]/g, ''));
    if (isNaN(cleanWage) || cleanWage <= 0) {
      setErrorMessage('Please enter a valid positive base wage (e.g. ₹35,000).');
      return;
    }

    const finalStartDate = startDate ? String(startDate).split('T')[0] : new Date().toISOString().split('T')[0];
    const finalEndDate = (endDate && String(endDate).trim() !== '') ? String(endDate).split('T')[0] : null;

    setSaving(true);
    try {
      const payload = {
        employee_id: Number(empId),
        reference_name: finalRef,
        salary_structure_id: Number(finalStructureId),
        working_schedule_id: Number(finalScheduleId),
        wage: cleanWage,
        wage_type: wageType || 'MONTHLY',
        start_date: finalStartDate,
        end_date: finalEndDate,
        status: status || 'ACTIVE',
        replace_active: Boolean(replaceActive)
      };

      if (selectedContract?.id) {
        await updateContractApi(selectedContract.id, payload);
      } else {
        await createContractApi(payload);
      }

      setIsModalOpen(false);
      setConflictContract(null);
      await fetchContracts();
    } catch (err) {
      console.error('Save contract failed', err);
      const apiMsg = err?.response?.data?.message || err.message || 'Failed to save contract';
      setErrorMessage(apiMsg);
      if (err?.response?.data?.hasOtherActive) {
        setConflictContract(err?.response?.data?.activeContractName || 'another active contract');
      }
    } finally {
      setSaving(false);
    }
  };

  // Delete contract
  const handleDelete = async (c, e) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete contract "${c.reference_name}"?`)) {
      return;
    }

    try {
      await deleteContractApi(c.id);
      await fetchContracts();
    } catch (err) {
      alert(err?.response?.data?.message || err.message || 'Failed to delete contract');
    }
  };

  // Current filtered employee object
  const currentEmployee = employees.find(e => String(e.id) === String(selectedEmployeeId));

  const columns = [
    {
      key: 'employee',
      header: 'Employee',
      render: (val, row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary-600/20 text-primary-600 font-bold flex items-center justify-center text-xs shrink-0 border border-primary-600/30">
            {(row.first_name?.[0] || 'E')}{(row.last_name?.[0] || '')}
          </div>
          <div>
            <div className="font-bold text-ink-900 flex items-center gap-1.5">
              <span>{row.first_name} {row.last_name}</span>
              <span className="text-[11px] font-mono text-ink-400 font-normal">({row.employee_code})</span>
            </div>
            <div className="text-xs text-ink-600 flex items-center gap-2 mt-0.5">
              <span>{row.department_name || 'General'}</span>
              <span>•</span>
              <span>{row.job_position_title || 'Staff'}</span>
            </div>
          </div>
        </div>
      )
    },
    {
      key: 'reference_name',
      header: 'Contract Reference',
      render: (val, row) => (
        <div>
          <span className="font-semibold text-ink-900 block">{val}</span>
          <span className="text-xs text-ink-600">{row.salary_structure_name || 'Standard Structure'}</span>
        </div>
      )
    },
    {
      key: 'start_date',
      header: 'Duration',
      render: (val, row) => (
        <div className="text-xs text-ink-900">
          <div>{formatDate(val)}</div>
          <div className="text-ink-600 mt-0.5">to {row.end_date ? formatDate(row.end_date) : 'Indefinite / Permanent'}</div>
        </div>
      )
    },
    {
      key: 'wage',
      header: 'Monthly Wage',
      align: 'right',
      render: (val, row) => (
        <div className="text-right">
          <span className="font-bold text-ink-900 text-sm">{formatDate(val) ? '' : ''}</span>
          <CurrencyCell amount={val} />
          <span className="text-[10px] text-ink-600 block uppercase">{row.wage_type || 'MONTHLY'}</span>
        </div>
      )
    },
    {
      key: 'status',
      header: 'Status',
      render: (val) => <StatusBadge status={val} />
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (val, row) => (
        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => handleOpenEdit(row)}
            className="p-1.5 text-ink-600 hover:text-primary-600 hover:bg-surface-muted rounded-xs transition-colors"
            title="Edit Contract"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          {user?.role === 'ADMIN' && (
            <button
              onClick={(e) => handleDelete(row, e)}
              className="p-1.5 text-ink-600 hover:text-danger-600 hover:bg-danger-50 rounded-xs transition-colors"
              title="Delete Contract"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Top Header & Context Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {paramEmployeeId && (
            <Button
              variant="secondary"
              icon={ArrowLeft}
              onClick={() => navigate(`/employees/${paramEmployeeId}`)}
            >
              Back to Employee
            </Button>
          )}
          <div>
            <h1 className="text-2xl font-bold font-display text-ink-900 flex items-center gap-2">
              <FileText className="w-6 h-6 text-primary-600" />
              <span>
                {currentEmployee
                  ? `Contracts — ${currentEmployee.first_name} ${currentEmployee.last_name}`
                  : 'Employee Contracts Directory'}
              </span>
            </h1>
            <p className="text-xs text-ink-600 mt-1">
              Select any employee from the dropdown below to view or assign their active employment contract and salary structure.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            icon={Plus}
            onClick={() => handleOpenNew()}
            className="!bg-[#C5A059] !text-slate-950 font-bold hover:!bg-[#b38e36]"
          >
            + New Contract
          </Button>
        </div>
      </div>

      {/* Filter & Dropdown Controls Bar */}
      <div className="p-4 bg-surface border border-border rounded-[var(--radius-md)] flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Employee Dropdown Selector */}
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-primary-600 shrink-0" />
            <span className="text-xs font-semibold text-ink-600">Employee:</span>
            <select
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              className="bg-surface-muted text-xs text-ink-900 font-medium border border-border-strong rounded-sm px-3 py-1.5 focus:outline-none focus:border-primary-600 cursor-pointer min-w-[240px]"
            >
              <option value="">All Employees ({employees.length})</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.first_name} {emp.last_name} ({emp.employee_code}) - {emp.department_name || 'General'}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-ink-400 shrink-0" />
            <span className="text-xs font-semibold text-ink-600">Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-surface-muted text-xs text-ink-900 font-medium border border-border-strong rounded-sm px-3 py-1.5 focus:outline-none focus:border-primary-600 cursor-pointer"
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">ACTIVE (Running)</option>
              <option value="DRAFT">DRAFT</option>
              <option value="EXPIRED">EXPIRED</option>
              <option value="TERMINATED">TERMINATED</option>
            </select>
          </div>
        </div>

        {selectedEmployeeId && (
          <button
            onClick={() => setSelectedEmployeeId('')}
            className="text-xs text-primary-600 hover:underline font-semibold"
          >
            Clear Filter (Show All Employees)
          </button>
        )}
      </div>

      {/* Active Contract Info Banner if viewing single employee */}
      {currentEmployee && (
        <div className="p-4 rounded-md bg-primary-500/10 border border-primary-600/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-600 text-slate-950 font-black flex items-center justify-center text-sm">
              {currentEmployee.first_name?.[0]}{currentEmployee.last_name?.[0]}
            </div>
            <div>
              <div className="text-sm font-bold text-ink-900">
                {currentEmployee.first_name} {currentEmployee.last_name}
                <span className="text-xs text-ink-400 font-normal ml-2">Code: {currentEmployee.employee_code}</span>
              </div>
              <div className="text-xs text-ink-600 mt-0.5">
                Department: <strong>{currentEmployee.department_name || 'General'}</strong> | Position: <strong>{currentEmployee.job_position_title || 'Staff'}</strong>
              </div>
            </div>
          </div>
          <Button
            variant="secondary"
            icon={Plus}
            size="sm"
            onClick={() => handleOpenNew(currentEmployee.id)}
            className="text-xs"
          >
            Add Contract for {currentEmployee.first_name}
          </Button>
        </div>
      )}

      {/* Contracts Table */}
      <DataTable
        columns={columns}
        data={contracts}
        loading={loading}
        onRowClick={(c) => handleOpenEdit(c)}
        emptyMessage={
          selectedEmployeeId
            ? `No contracts found for ${currentEmployee?.first_name || 'this employee'}. Click "+ New Contract" above to create one.`
            : 'No contracts registered in the system.'
        }
      />

      {/* Create / Edit Contract Modal Drawer */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedContract ? `Edit Contract: ${selectedContract.reference_name}` : 'Create New Employment Contract'}
        footer={
          <div className="flex items-center justify-end gap-3 w-full">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <button
              type="button"
              onClick={(e) => handleSave(e)}
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 font-bold text-sm rounded-[var(--radius-sm)] h-9 px-5 bg-[#C5A059] hover:bg-[#b38e36] text-slate-950 shadow-md shadow-amber-500/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-all"
            >
              {saving ? 'Saving Contract...' : selectedContract ? 'Update Contract' : 'Create & Assign Contract'}
            </button>
          </div>
        }
      >
        {conflictContract ? (
          <div className="mb-4 p-4 rounded-md bg-amber-500/10 border border-amber-500/40 text-xs flex flex-col gap-2.5 animate-in fade-in">
            <div className="flex items-center gap-2 text-amber-400 font-bold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Active Contract Conflict</span>
            </div>
            <p className="text-ink-300 leading-relaxed">
              This employee already has an active contract: <strong className="text-amber-300 font-semibold">{conflictContract}</strong>. HR rules permit only 1 ACTIVE contract per employee at a time.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Button
                type="button"
                variant="primary"
                size="sm"
                disabled={saving}
                onClick={() => handleSave(null, true)}
                className="!bg-amber-500 !text-slate-950 font-bold hover:!bg-amber-400 text-xs h-8"
              >
                Set as Active & Archive Previous
              </Button>
              <button
                type="button"
                onClick={() => { setStatus('DRAFT'); setConflictContract(null); setErrorMessage(''); }}
                className="text-xs text-ink-400 hover:text-ink-200 underline cursor-pointer px-2 py-1"
              >
                Change status to DRAFT instead
              </button>
            </div>
          </div>
        ) : errorMessage ? (
          <div className="mb-4 p-3.5 rounded-md bg-danger-500/15 border border-danger-500/40 text-xs font-semibold text-danger-300 flex items-center gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-danger-400" />
            <span>{errorMessage}</span>
          </div>
        ) : null}

        <form id="contract-form" onSubmit={handleSave} className="flex flex-col gap-4">
          {/* Employee Display: If selected in prev step / editing, show clear locked card (no dropdown) */}
          {lockedEmployee ? (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-ink-900">Employee</label>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-primary-400 bg-primary-950/60 px-2 py-0.5 rounded-full border border-primary-600/30 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-primary-400" />
                    {selectedContract ? 'Assigned' : 'Pre-selected'}
                  </span>
                  {!selectedContract && (
                    <button
                      type="button"
                      onClick={() => {
                        setLockedEmployee(null);
                        setFormEmployeeId('');
                      }}
                      className="text-[11px] font-semibold text-primary-500 hover:text-primary-400 underline cursor-pointer"
                    >
                      Change Employee
                    </button>
                  )}
                </div>
              </div>
              <div className="p-3.5 rounded-md bg-surface-muted/90 border border-primary-600/40 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary-600/20 border border-primary-600/40 text-primary-400 font-bold flex items-center justify-center text-sm shrink-0">
                    {(lockedEmployee.first_name?.[0] || 'E')}{(lockedEmployee.last_name?.[0] || '')}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-ink-900 flex items-center gap-2">
                      <span>{lockedEmployee.first_name} {lockedEmployee.last_name}</span>
                      <span className="text-xs font-mono text-ink-400 font-normal">({lockedEmployee.employee_code})</span>
                    </div>
                    <div className="text-xs text-ink-600 flex items-center gap-2 mt-0.5">
                      <span>{lockedEmployee.department_name || 'General'}</span>
                      <span>•</span>
                      <span>{lockedEmployee.job_position_title || 'Staff'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-ink-900">
                Select Employee <span className="text-danger-600">*</span>
              </label>
              <select
                value={formEmployeeId}
                onChange={(e) => handleFormEmployeeChange(e.target.value)}
                className="bg-surface-muted text-xs text-ink-900 border border-border-strong rounded-sm px-3 py-2 focus:outline-none focus:border-primary-600 cursor-pointer"
                required
              >
                <option value="">-- Choose Employee from Directory --</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.first_name} {emp.last_name} ({emp.employee_code}) - {emp.department_name || 'General'}
                  </option>
                ))}
              </select>
            </div>
          )}

          <Input
            label="Contract Reference Name"
            value={referenceName}
            onChange={(e) => setReferenceName(e.target.value)}
            placeholder="e.g. Alex Morgan - 2026 Executive Agreement"
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Monthly Wage (₹ INR)"
              type="number"
              step="0.01"
              value={wage}
              onChange={(e) => setWage(e.target.value)}
              required
            />
            <Select
              label="Wage Payment Frequency"
              value={wageType}
              onChange={(e) => setWageType(e.target.value)}
            >
              <option value="MONTHLY">Monthly</option>
              <option value="HOURLY">Hourly</option>
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Salary Structure *"
              value={salaryStructureId || (structures[0]?.id || '1')}
              onChange={(e) => setSalaryStructureId(e.target.value)}
              required
            >
              {structures.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </Select>

            <Select
              label="Working Schedule"
              value={workingScheduleId || (schedules[0]?.id || '1')}
              onChange={(e) => setWorkingScheduleId(e.target.value)}
            >
              {schedules.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.total_weekly_hours || 40}h/week)
                </option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Contract Start Date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
            <Input
              label="Contract End Date (Optional)"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              placeholder="Leave blank for permanent"
            />
          </div>

          <Select
            label="Contract Status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="ACTIVE">ACTIVE (Running — eligible for monthly payroll)</option>
            <option value="DRAFT">DRAFT (Under review / pending signature)</option>
            <option value="EXPIRED">EXPIRED (Contract period ended)</option>
            <option value="TERMINATED">TERMINATED (Employment ended)</option>
          </Select>

          <p className="text-[11px] text-ink-600 italic">
            * Note: According to HR & Payroll rules, an employee can have only 1 ACTIVE contract at any given time.
          </p>
        </form>
      </Modal>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, FileText, ArrowLeft, AlertCircle } from 'lucide-react';
import {
  getContractsApi,
  createContractApi,
  updateContractApi,
  getWorkShiftsApi,
  getSalaryStructuresApi,
  getEmployeeByIdApi,
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
  const { id } = useParams();
  const navigate = useNavigate();
  const { can } = useAuth();

  const [contracts, setContracts] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [structures, setStructures] = useState([]);
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form state
  const [selectedContract, setSelectedContract] = useState(null);
  const [jobPosition, setJobPosition] = useState('');
  const [startDate, setStartDate] = useState('2026-01-01');
  const [endDate, setEndDate] = useState('2026-12-31');
  const [wage, setWage] = useState(7500);
  const [workingScheduleId, setWorkingScheduleId] = useState('');
  const [salaryStructureId, setSalaryStructureId] = useState('');
  const [status, setStatus] = useState('ACTIVE'); // ACTIVE, DRAFT, EXPIRED, TERMINATED
  const [errorMessage, setErrorMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [cRes, sRes, stRes, empRes] = await Promise.all([
        getContractsApi({ employee_id: id }),
        getWorkShiftsApi(),
        getSalaryStructuresApi(),
        id ? getEmployeeByIdApi(id) : Promise.resolve(null),
      ]);

      const rawContracts = cRes?.data || cRes || [];
      const rawSchedules = sRes?.data || sRes || [];
      const rawStructs = stRes?.data || stRes || [];
      const empData = empRes?.data || empRes;

      const formattedContracts = rawContracts.map((c) => ({
        id: c.id,
        employeeId: c.employee_id,
        employeeName: c.first_name ? `${c.first_name} ${c.last_name || ''}`.trim() : 'Employee',
        jobPosition: c.job_position_title || c.reference_name || 'Software Engineer',
        referenceName: c.reference_name,
        startDate: c.start_date,
        endDate: c.end_date,
        wage: parseFloat(c.wage || 0),
        workingScheduleId: c.working_schedule_id,
        salaryStructureId: c.salary_structure_id,
        status: c.status === 'ACTIVE' ? 'Running' : c.status
      }));

      setContracts(formattedContracts);
      setSchedules(rawSchedules);
      setStructures(rawStructs);
      if (empData) {
        setEmployee({
          id: empData.id,
          name: empData.first_name ? `${empData.first_name} ${empData.last_name || ''}`.trim() : 'Employee',
          jobTitle: empData.job_position_title || empData.job_title || 'Software Engineer'
        });
      }

      if (rawSchedules.length) setWorkingScheduleId(rawSchedules[0].id);
      if (rawStructs.length) setSalaryStructureId(rawStructs[0].id);
      if (empData) setJobPosition(empData.job_position_title || empData.job_title || 'Software Engineer');
    } catch (err) {
      console.error('Failed to load contract details', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleOpenNew = () => {
    setSelectedContract(null);
    setJobPosition(employee?.jobTitle || 'Software Engineer');
    setWage(7500);
    setStatus('ACTIVE');
    setErrorMessage('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (c) => {
    setSelectedContract(c);
    setJobPosition(c.jobPosition);
    setStartDate(c.startDate ? c.startDate.substring(0, 10) : '2026-01-01');
    setEndDate(c.endDate ? c.endDate.substring(0, 10) : '2026-12-31');
    setWage(c.wage);
    setWorkingScheduleId(c.workingScheduleId || '');
    setSalaryStructureId(c.salaryStructureId || '');
    setStatus(c.status === 'Running' ? 'ACTIVE' : c.status);
    setErrorMessage('');
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSaving(true);
    try {
      const payload = {
        employee_id: id || selectedContract?.employeeId || 1,
        reference_name: jobPosition,
        startDate: startDate,
        start_date: startDate,
        endDate: endDate,
        end_date: endDate,
        wage: Number(wage),
        working_schedule_id: workingScheduleId || null,
        salary_structure_id: salaryStructureId || 1,
        status: status === 'Running' ? 'ACTIVE' : status
      };

      if (selectedContract?.id) {
        await updateContractApi(selectedContract.id, payload);
      } else {
        await createContractApi(payload);
      }

      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      setErrorMessage(err.response?.data?.message || err.message || 'Validation error saving contract');
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { key: 'jobPosition', header: 'Job Position' },
    { key: 'startDate', header: 'Start Date', render: (val) => formatDate(val) },
    { key: 'endDate', header: 'End Date', render: (val) => formatDate(val) },
    {
      key: 'wage',
      header: 'Wage / Month',
      align: 'right',
      render: (val) => <CurrencyCell amount={val} />,
    },
    {
      key: 'status',
      header: 'Contract Status',
      render: (val) => <StatusBadge status={val} />,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {id && (
            <Button variant="secondary" icon={ArrowLeft} onClick={() => navigate(`/employees/${id}`)}>
              Back to Employee
            </Button>
          )}
          <div>
            <h1 className="text-2xl font-bold font-display text-ink-900 flex items-center gap-2">
              <FileText className="w-6 h-6 text-primary-600" />
              <span>Contracts {employee ? `— ${employee.name}` : ''}</span>
            </h1>
            <p className="text-xs text-ink-600 mt-1">
              Payroll resolves the specific contract running during the pay period. (Max 1 Running contract allowed at any given time).
            </p>
          </div>
        </div>

        {can('contracts.manage') && (
          <Button variant="primary" icon={Plus} onClick={handleOpenNew}>
            New Contract
          </Button>
        )}
      </div>

      <DataTable
        columns={columns}
        data={contracts}
        onRowClick={(c) => can('contracts.manage') && handleOpenEdit(c)}
        emptyMessage="No contracts found for this employee"
      />

      {/* Contract Form Modal Drawer */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedContract ? 'Edit Contract Record' : 'Create New Contract'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Contract'}
            </Button>
          </>
        }
      >
        {errorMessage && (
          <div className="mb-4 p-3 rounded-sm bg-danger-50 border border-danger-600/30 text-xs font-semibold text-danger-600 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <Input
            label="Job Position Title"
            value={jobPosition}
            onChange={(e) => setJobPosition(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Start Date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
            <Input
              label="End Date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
            />
          </div>

          <Input
            label="Monthly Wage ($ USD)"
            type="number"
            value={wage}
            onChange={(e) => setWage(e.target.value)}
            required
          />

          <Select
            label="Working Schedule"
            value={workingScheduleId}
            onChange={(e) => setWorkingScheduleId(e.target.value)}
          >
            {schedules.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.hoursPerWeek}h/wk)
              </option>
            ))}
          </Select>

          <Select
            label="Salary Structure"
            value={salaryStructureId}
            onChange={(e) => setSalaryStructureId(e.target.value)}
          >
            {structures.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.code})
              </option>
            ))}
          </Select>

          <Select
            label="Contract Status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="Running">Running (Active for Payroll)</option>
            <option value="Draft">Draft</option>
            <option value="Expired">Expired</option>
            <option value="Terminated">Terminated</option>
          </Select>
        </form>
      </Modal>
    </div>
  );
}

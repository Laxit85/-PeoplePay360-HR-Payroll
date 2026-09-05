import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, DollarSign, ArrowRight } from 'lucide-react';
import {
  getPayrunsApi,
  getSalaryStructuresApi,
  getEligibleEmployeesApi,
  createPayrunApi,
} from '../../../api';
import { DataTable } from '../../../components/data/DataTable';
import { StatusBadge } from '../../../components/data/StatusBadge';
import { CurrencyCell } from '../../../components/data/CurrencyCell';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { StepStructurePeriod } from './wizard/StepStructurePeriod';
import { StepEmployeeSelect } from './wizard/StepEmployeeSelect';
import { formatDate } from '../../../lib/format';
import { useAuth } from '../../../auth/useAuth';

export function PayrunListPage() {
  const navigate = useNavigate();
  const { can } = useAuth();

  const [payruns, setPayruns] = useState([]);
  const [structures, setStructures] = useState([]);
  const [loading, setLoading] = useState(true);

  // Wizard Modal State
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1); // 1 or 2

  // Wizard Local State (NO DB WRITE UNTIL FINAL CLICK)
  const [salaryStructureId, setSalaryStructureId] = useState('');
  const [periodStart, setPeriodStart] = useState('2026-09-01');
  const [periodEnd, setPeriodEnd] = useState('2026-09-30');
  const [eligibleEmployees, setEligibleEmployees] = useState([]);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([]);
  const [eligibleLoading, setEligibleLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  const fetchPayruns = async () => {
    setLoading(true);
    try {
      const [pRes, sRes] = await Promise.all([
        getPayrunsApi(),
        getSalaryStructuresApi(),
      ]);

      const rawPayruns = pRes?.data || pRes || [];
      const rawStructs = sRes?.data || sRes || [];

      const formattedPayruns = rawPayruns.map((p) => ({
        id: p.id,
        name: p.name || `Payrun #${p.id}`,
        salaryStructureName: p.salary_structure_name || 'Standard Structure',
        periodStart: p.period_start,
        periodEnd: p.period_end,
        totalNetWage: parseFloat(p.total_net || p.total_net_wage || 0),
        status: p.status || 'DRAFT',
        employeeCount: p.total_employees || p.employee_count || 0
      }));

      setPayruns(formattedPayruns);
      setStructures(rawStructs);
      if (rawStructs.length) setSalaryStructureId(rawStructs[0].id);
    } catch (err) {
      console.error('Failed to fetch payruns', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayruns();
  }, []);

  const handleOpenWizard = () => {
    setWizardStep(1);
    setIsWizardOpen(true);
  };

  const handleStep1Continue = async () => {
    setEligibleLoading(true);
    try {
      const res = await getEligibleEmployeesApi({
        salary_structure_id: salaryStructureId,
        period_start: periodStart,
        period_end: periodEnd,
      });
      const rows = res?.data || res || [];
      const eligible = rows.map((r) => ({
        employeeId: r.employee_id,
        employeeName: r.full_name,
        jobPosition: r.job_position_title || 'Staff',
        department: r.department_name || 'General',
        contractId: r.contract_id,
        wage: parseFloat(r.contract_wage || 0),
        workingHours: '40h/wk',
        hasBankDetails: Boolean(r.has_bank_details),
      }));

      setEligibleEmployees(eligible);
      setSelectedEmployeeIds(eligible.map((e) => e.employeeId));
      setWizardStep(2);
    } catch (err) {
      console.error('Failed to fetch eligible employees', err);
      alert('Unable to load eligible employees for the selected structure and dates.');
    } finally {
      setEligibleLoading(false);
    }
  };

  const handleFinalCreatePayrun = async () => {
    if (!selectedEmployeeIds.length) {
      alert('Please select at least one employee for the pay run.');
      return;
    }
    setCreating(true);
    try {
      const res = await createPayrunApi({
        name: `Pay Run (${formatDate(periodStart)} – ${formatDate(periodEnd)})`,
        salary_structure_id: salaryStructureId,
        period_start: periodStart,
        period_end: periodEnd,
        selected_employee_ids: selectedEmployeeIds,
      });
      const createdId = res?.data?.id || res?.id;
      setIsWizardOpen(false);
      navigate(`/payroll/payruns/${createdId}`);
    } catch (err) {
      console.error('Failed to create payrun', err);
      alert('Failed to initialize pay run batch in database.');
    } finally {
      setCreating(false);
    }
  };

  const columns = [
    {
      key: 'name',
      header: 'Pay Run Name',
      render: (val, row) => (
        <div>
          <span className="font-bold text-ink-900">{val}</span>
          <p className="text-xs text-ink-600">
            {formatDate(row.periodStart)} – {formatDate(row.periodEnd)}
          </p>
        </div>
      ),
    },
    {
      key: 'payslipCount',
      header: 'Payslips',
      align: 'center',
      render: (val) => <span className="font-semibold">{val} records</span>,
    },
    {
      key: 'totalGross',
      header: 'Total Gross',
      align: 'right',
      render: (val) => <CurrencyCell amount={val} />,
    },
    {
      key: 'totalNet',
      header: 'Total Net Paid',
      align: 'right',
      render: (val) => <CurrencyCell amount={val} className="text-money-600 font-extrabold" />,
    },
    { key: 'status', header: 'Status', render: (val) => <StatusBadge status={val} /> },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-ink-900 flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-primary-600" />
            <span>Pay Runs</span>
          </h1>
          <p className="text-xs text-ink-600 mt-1">
            Batch payroll runs created via a strict 2-step wizard.
          </p>
        </div>
        {can('payroll.payruns.manage') && (
          <Button variant="primary" icon={Plus} onClick={handleOpenWizard}>
            New Pay Run
          </Button>
        )}
      </div>

      <DataTable
        columns={columns}
        data={payruns}
        onRowClick={(p) => navigate(`/payroll/payruns/${p.id}`)}
        emptyMessage="No pay runs found"
      />

      {/* 2-Step Payrun Wizard Modal */}
      <Modal
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        title={wizardStep === 1 ? 'New Pay Run — Step 1: Structure & Period' : 'New Pay Run — Step 2: Select Employees'}
        footer={
          wizardStep === 1 ? (
            <>
              <Button variant="secondary" onClick={() => setIsWizardOpen(false)}>
                Discard
              </Button>
              <Button variant="primary" onClick={handleStep1Continue} disabled={eligibleLoading}>
                {eligibleLoading ? 'Checking Active Contracts...' : 'Continue'}
              </Button>
            </>
          ) : (
            <>
              <Button variant="secondary" onClick={() => setWizardStep(1)}>
                Back
              </Button>
              <Button variant="primary" onClick={handleFinalCreatePayrun} disabled={creating}>
                {creating ? 'Creating Pay Run...' : 'Create Payrun'}
              </Button>
            </>
          )
        }
      >
        {wizardStep === 1 ? (
          <StepStructurePeriod
            structures={structures}
            salaryStructureId={salaryStructureId}
            setSalaryStructureId={setSalaryStructureId}
            periodStart={periodStart}
            setPeriodStart={setPeriodStart}
            periodEnd={periodEnd}
            setPeriodEnd={setPeriodEnd}
          />
        ) : (
          <StepEmployeeSelect
            eligibleEmployees={eligibleEmployees}
            selectedEmployeeIds={selectedEmployeeIds}
            setSelectedEmployeeIds={setSelectedEmployeeIds}
            loading={eligibleLoading}
          />
        )}
      </Modal>
    </div>
  );
}

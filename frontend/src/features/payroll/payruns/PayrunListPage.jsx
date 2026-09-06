import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, IndianRupee, ArrowRight, Trash2, Eye } from 'lucide-react';
import {
  getPayrunsApi,
  getSalaryStructuresApi,
  createPayrunApi,
  deletePayrunApi,
  getEligibleEmployeesApi,
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
  const { user, can } = useAuth();

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
        totalGross: parseFloat(p.total_gross || 0),
        totalNet: parseFloat(p.total_net || 0),
        totalDeductions: parseFloat(p.total_deductions || 0),
        status: p.status || 'DRAFT',
        payslipCount: p.total_employees !== undefined ? p.total_employees : (p.payslip_count || 0)
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
      const res = await getEligibleEmployeesApi(salaryStructureId, periodStart, periodEnd);
      const rawEligible = res?.data || res || [];
      const eligible = rawEligible.map((e) => ({
        employeeId: e.employee_id || e.id,
        name: e.full_name || `${e.first_name || ''} ${e.last_name || ''}`.trim(),
        employeeName: e.full_name || `${e.first_name || ''} ${e.last_name || ''}`.trim(),
        code: e.employee_code,
        department: e.department_name,
        position: e.job_position_title,
        wage: e.contract_wage,
        contractRef: e.contract_reference,
        startDate: e.start_date,
        hasBankDetails: Boolean(e.has_bank_details)
      }));
      setEligibleEmployees(eligible);
      setSelectedEmployeeIds(eligible.map((e) => e.employeeId));
      setWizardStep(2);
    } catch (err) {
      console.error('Failed to query eligible employees', err);
      alert(err?.response?.data?.message || err.message || 'Failed to query eligible employees');
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
      const pStart = periodStart || '2026-09-01';
      const pEnd = periodEnd || '2026-09-30';
      const monthName = new Date(pStart + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      const empCount = selectedEmployeeIds.length;
      const runName = `${monthName} Pay Run (${empCount} employee${empCount > 1 ? 's' : ''})`;

      const res = await createPayrunApi({
        name: runName,
        salary_structure_id: Number(salaryStructureId) || 1,
        period_start: pStart,
        period_end: pEnd,
        selected_employee_ids: selectedEmployeeIds,
      });
      const created = res?.data || res;
      setIsWizardOpen(false);
      navigate(`/payroll/payruns/${created.id}`);
    } catch (err) {
      console.error('Failed to create payrun', err);
      alert(err?.response?.data?.message || err.message || 'Failed to create pay run');
    } finally {
      setCreating(false);
    }
  };

  const handleDeletePayrun = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete pay run "${name || `#${id}`}"? All draft/computed payslips in this run will be permanently removed.`)) {
      return;
    }
    try {
      await deletePayrunApi(id);
      fetchPayruns();
    } catch (err) {
      console.error('Failed to delete payrun', err);
      alert(err?.response?.data?.message || err.message || 'Failed to delete pay run');
    }
  };

  const canDelete =
    can('payroll.payruns.delete') ||
    can('payroll.payruns.manage') ||
    user?.role === 'ADMIN' ||
    user?.role === 'HR_PAYROLL_MANAGER' ||
    user?.role === 'HR_PAYROLL_USER';

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
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (_, row) => (
        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="secondary"
            size="sm"
            icon={Eye}
            onClick={() => navigate(`/payroll/payruns/${row.id}`)}
            title="View Pay Run"
          >
            View
          </Button>
          {canDelete && (
            <Button
              variant="ghost"
              size="sm"
              icon={Trash2}
              className="!text-rose-600 hover:!text-rose-700 hover:!bg-rose-50 border border-rose-200/60"
              onClick={() => handleDeletePayrun(row.id, row.name)}
              title="Delete Pay Run"
            >
              Delete
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-ink-900 flex items-center gap-2">
            <IndianRupee className="w-6 h-6 text-primary-600" />
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

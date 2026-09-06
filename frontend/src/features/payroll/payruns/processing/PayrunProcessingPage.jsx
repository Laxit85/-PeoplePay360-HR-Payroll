import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Play,
  CheckCircle,
  CreditCard,
  Mail,
  FileText,
  Download,
  AlertCircle,
  Send,
} from 'lucide-react';
import {
  getPayrunByIdApi,
  processPayrunApi,
  validatePayrunApi,
  markPayrunPaidApi,
  sendPayslipsApi,
  testPayrollEmailApi,
  getPayslipPdfUrl,
  downloadPayslipPdfApi,
} from '../../../../api';
import { DataTable } from '../../../../components/data/DataTable';
import { StatusBadge } from '../../../../components/data/StatusBadge';
import { CurrencyCell } from '../../../../components/data/CurrencyCell';
import { Button } from '../../../../components/ui/Button';
import { WarningsPanel } from './WarningsPanel';
import { formatDate } from '../../../../lib/format';
import { useAuth } from '../../../../auth/useAuth';

export function PayrunProcessingPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, can } = useAuth();

  const [payrun, setPayrun] = useState(null);
  const [payslips, setPayslips] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const fetchDetail = async () => {
    setLoading(true);
    try {
      const res = await getPayrunByIdApi(id);
      const pr = res.data || res;
      setPayrun(pr);
      const rawSlips = res.payslips || pr.payslips || [];
      const rawWarnings = res.warnings || pr.warnings || [];
      setWarnings(rawWarnings);

      const formatted = rawSlips.map((s) => ({
        id: s.id,
        employeeId: s.employee_id,
        employeeName: s.first_name
          ? `${s.first_name} ${s.last_name || ''}`.trim()
          : (s.employeeName || `EMP-${s.employee_id}`),
        employeeCode: s.employee_code,
        department: s.department_name || s.department || 'General',
        jobPosition: s.contract_reference || 'Standard Contract',
        workedDays: s.worked_days != null ? parseFloat(s.worked_days) : 22,
        basic: parseFloat(s.contract_wage || 0),
        allowances: Math.max(0, (s.gross_salary != null ? parseFloat(s.gross_salary) : parseFloat(s.contract_wage || 0)) - parseFloat(s.contract_wage || 0)),
        deductions: parseFloat(s.total_deductions || 0),
        gross: s.gross_salary != null ? parseFloat(s.gross_salary) : parseFloat(s.contract_wage || 0),
        net: s.net_salary != null ? parseFloat(s.net_salary) : parseFloat(s.contract_wage || 0),
        status: s.status || 'DRAFT',
        warnings: rawWarnings.filter((w) => w.payslip_id === s.id || w.employee_id === s.employee_id),
      }));
      setPayslips(formatted);
    } catch (err) {
      console.error('Failed to load payrun details', err);
      navigate('/payroll/payruns');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const handleCompute = async () => {
    setActionLoading(true);
    try {
      await processPayrunApi(id);
      await fetchDetail();
    } catch (err) {
      alert(err?.response?.data?.message || err.message || 'Compute failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleValidate = async () => {
    setActionLoading(true);
    try {
      await validatePayrunApi(id);
      await fetchDetail();
    } catch (err) {
      alert(err?.response?.data?.message || err.message || 'Validation failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkPaid = async () => {
    setActionLoading(true);
    try {
      await markPayrunPaidApi(id);
      await fetchDetail();
    } catch (err) {
      alert(err?.response?.data?.message || err.message || 'Failed to mark payrun as paid');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendPayslips = async () => {
    setActionLoading(true);
    try {
      const res = await sendPayslipsApi(id);
      setEmailSent(true);
      alert(res?.message || 'Payslip broadcast dispatched successfully');
      setTimeout(() => setEmailSent(false), 4000);
      await fetchDetail();
    } catch (err) {
      alert(err?.response?.data?.message || err.message || 'Failed to send payslips');
    } finally {
      setActionLoading(false);
    }
  };

  const handleTestEmailPrompt = async () => {
    const targetEmail = prompt(
      'Enter a Gmail or email address to receive a live test payslip with itemized Basic Salary & Allowances:',
      user?.email || ''
    );
    if (!targetEmail || !targetEmail.trim()) return;
    setActionLoading(true);
    try {
      const res = await testPayrollEmailApi(targetEmail.trim());
      if (res.previewUrl) {
        alert(`Test payslip generated!\n\nMock Ethereal Preview URL:\n${res.previewUrl}\n\n(Open link in browser to view rendered email & PDF attachment)`);
      } else {
        alert(`Success! Test payslip email dispatched to ${targetEmail.trim()}.\nMessage ID: ${res.messageId || 'OK'}`);
      }
    } catch (err) {
      alert(err?.response?.data?.message || err.message || 'Failed to send test email');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading || !payrun) {
    return <div className="p-12 text-center text-ink-600 font-medium">Loading pay run batch details...</div>;
  }

  const statusUpper = String(payrun.status || '').toUpperCase();
  const isDraft = statusUpper === 'DRAFT';
  const isComputed = statusUpper === 'COMPUTED';
  const isValidated = statusUpper === 'VALIDATED';
  const isPaid = statusUpper === 'PAID';

  const isManagerOrAdmin = user?.role === 'ADMIN' || user?.role === 'HR_PAYROLL_MANAGER';

  const columns = [
    {
      key: 'employeeName',
      header: 'Employee Name',
      render: (val, row) => (
        <div>
          <span className="font-bold text-ink-900">{val}</span>
          <p className="text-xs text-ink-600">
            {row.employeeCode ? `${row.employeeCode} • ` : ''}
            {row.department}
          </p>
        </div>
      ),
    },
    { key: 'workedDays', header: 'Worked Days', align: 'center', render: (val) => `${val}d` },
    {
      key: 'basic',
      header: 'Base Wage',
      align: 'right',
      render: (val) => <CurrencyCell amount={val} />,
    },
    {
      key: 'gross',
      header: 'Gross Salary',
      align: 'right',
      render: (val) => <CurrencyCell amount={val} />,
    },
    {
      key: 'deductions',
      header: 'Deductions',
      align: 'right',
      render: (val) => <CurrencyCell amount={val} className="text-rose-600" />,
    },
    {
      key: 'net',
      header: 'Net Salary',
      align: 'right',
      render: (val) => <CurrencyCell amount={val} className="text-emerald-600 font-bold" />,
    },
    {
      key: 'status',
      header: 'Status',
      render: (val, row) => (
        <div className="flex items-center gap-2">
          <StatusBadge status={val} />
          {row.warnings && row.warnings.length > 0 && (
            <span className="px-2 py-0.5 rounded-pill bg-amber-50 text-amber-600 text-xs font-semibold border border-amber-200">
              {row.warnings.length} Warning(s)
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Payslip Actions',
      align: 'right',
      render: (_, row) => (
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="sm"
            icon={Download}
            onClick={() => downloadPayslipPdfApi(row.id, `Payslip_${row.employee_code || row.id}.pdf`)}
            title="Download PDF Payslip"
          >
            PDF
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={FileText}
            onClick={() => navigate(`/payroll/payslips/${row.id}`)}
          >
            Lines
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6 scroll-reveal">
      {/* Header & Status Workflow Bar */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="secondary" icon={ArrowLeft} onClick={() => navigate('/payroll/payruns')}>
              Back to Pay Runs
            </Button>
            <div>
              <h1 className="text-2xl font-bold font-display text-ink-900">{payrun.name}</h1>
              <p className="text-xs text-ink-600">
                Period: {formatDate(payrun.period_start || payrun.periodStart)} –{' '}
                {formatDate(payrun.period_end || payrun.periodEnd)} • Structure:{' '}
                <strong>{payrun.salary_structure_name || 'Standard Structure'}</strong>
              </p>
            </div>
          </div>
          <StatusBadge status={statusUpper} className="text-sm px-3 py-1 font-bold" />
        </div>

        {/* Workflow Lifecycle Action Bar */}
        <div className="p-4 bg-surface border border-border rounded-[var(--radius-md)] flex flex-wrap items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center flex-wrap gap-2">
            <Button
              variant={isDraft || isComputed ? "primary" : "secondary"}
              icon={Play}
              disabled={actionLoading}
              onClick={handleCompute}
              title="Compute or Recompute Pay Run (Recalculates contract wages & attendances)"
            >
              1. Compute Pay Run
            </Button>

            <Button
              variant={isComputed ? "primary" : "secondary"}
              icon={CheckCircle}
              disabled={actionLoading}
              onClick={handleValidate}
              className={isComputed ? "!bg-primary-600" : ""}
              title="Validate and lock pay run batch"
            >
              2. Validate Batch
            </Button>

            <Button
              variant={isValidated || isPaid ? "primary" : "secondary"}
              icon={CreditCard}
              disabled={actionLoading}
              onClick={handleMarkPaid}
              className={isPaid ? "!bg-emerald-700 hover:!bg-emerald-800 !text-white font-bold" : isValidated ? "!bg-emerald-600 hover:!bg-emerald-700 !text-white font-bold" : ""}
              title="Mark pay run batch as PAID"
            >
              3. Mark Paid
            </Button>

            <Button
              variant="primary"
              icon={Mail}
              disabled={actionLoading}
              onClick={handleSendPayslips}
              className="!bg-blue-600 hover:!bg-blue-700 !text-white font-bold shadow-sm"
              title="Send payslips to all employees via email"
            >
              4. Send Payslips (Email)
            </Button>

            <Button
              variant="ghost"
              icon={Send}
              disabled={actionLoading}
              onClick={handleTestEmailPrompt}
              className="!text-xs text-primary-600 hover:text-primary-700 font-semibold"
              title="Send a sample payslip to your personal email"
            >
              Test Email Delivery
            </Button>
          </div>

          {emailSent && (
            <div className="px-3 py-1 rounded-sm bg-emerald-50 text-emerald-600 text-xs font-semibold border border-emerald-600/30">
              ✓ Payslip distribution dispatched to all employee inboxes!
            </div>
          )}
        </div>
      </div>

      {/* Warnings Panel */}
      <WarningsPanel payslips={payslips} />

      {/* Payslips Table */}
      <DataTable
        columns={columns}
        data={payslips}
        onRowClick={(ps) => navigate(`/payroll/payslips/${ps.id}`)}
        emptyMessage="Click '1. Compute Pay Run' above to generate individual payslips and calculate salary rules."
      />
    </div>
  );
}

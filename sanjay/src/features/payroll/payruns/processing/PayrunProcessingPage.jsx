import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Play,
  CheckCircle,
  CreditCard,
  Mail,
  FileText,
  AlertCircle,
} from 'lucide-react';
import {
  getPayrunById,
  computePayrun,
  validatePayrun,
  markPayrunPaid,
} from '../../../../mockApi/apiHandlers';
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
  const { can } = useAuth();

  const [payrun, setPayrun] = useState(null);
  const [payslips, setPayslips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const fetchDetail = async () => {
    setLoading(true);
    try {
      const res = await getPayrunById(id);
      setPayrun(res);
      setPayslips(res.payslips || []);
    } catch {
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
      await computePayrun(id);
      fetchDetail();
    } finally {
      setActionLoading(false);
    }
  };

  const handleValidate = async () => {
    setActionLoading(true);
    try {
      await validatePayrun(id);
      fetchDetail();
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkPaid = async () => {
    setActionLoading(true);
    try {
      await markPayrunPaid(id);
      fetchDetail();
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendPayslips = () => {
    setEmailSent(true);
    setTimeout(() => setEmailSent(false), 4000);
  };

  if (loading || !payrun) {
    return <div className="p-12 text-center text-ink-600 font-medium">Loading pay run details...</div>;
  }

  const isDraft = payrun.status === 'Draft';
  const isComputed = payrun.status === 'Computed';
  const isValidated = payrun.status === 'Validated';
  const isPaid = payrun.status === 'Paid';

  const columns = [
    {
      key: 'employeeName',
      header: 'Employee Name',
      render: (val, row) => (
        <div>
          <span className="font-bold text-ink-900">{val}</span>
          <p className="text-xs text-ink-600">{row.department} — {row.jobPosition}</p>
        </div>
      ),
    },
    { key: 'workedDays', header: 'Days', align: 'center', render: (val) => `${val}d` },
    {
      key: 'basic',
      header: 'Basic Salary',
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
      key: 'net',
      header: 'Net Salary',
      align: 'right',
      render: (val) => <CurrencyCell amount={val} className="text-money-600 font-bold" />,
    },
    {
      key: 'status',
      header: 'Status',
      render: (val, row) => (
        <div className="flex items-center gap-2">
          <StatusBadge status={val} />
          {row.warnings && row.warnings.length > 0 && (
            <span className="px-2 py-0.5 rounded-pill bg-amber-50 text-amber-600 text-xs font-semibold">
              Warning
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Payslip',
      align: 'right',
      render: (_, row) => (
        <Button
          variant="ghost"
          size="sm"
          icon={FileText}
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/payroll/payslips/${row.id}`);
          }}
        >
          View Line Items
        </Button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Header & Status Workflow Bar */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="secondary" icon={ArrowLeft} onClick={() => navigate('/payroll/payruns')}>
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold font-display text-ink-900">{payrun.name}</h1>
              <p className="text-xs text-ink-600">
                Period: {formatDate(payrun.periodStart)} – {formatDate(payrun.periodEnd)}
              </p>
            </div>
          </div>
          <StatusBadge status={payrun.status} className="text-sm px-3 py-1" />
        </div>

        {/* Workflow Lifecycle Action Bar (§5.5, §8.4) */}
        <div className="p-4 bg-surface border border-border rounded-[var(--radius-md)] flex flex-wrap items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              icon={Play}
              disabled={!isDraft || actionLoading}
              onClick={handleCompute}
            >
              1. Compute Salary Rules
            </Button>
            <Button
              variant="primary"
              icon={CheckCircle}
              disabled={!isComputed || actionLoading}
              onClick={handleValidate}
              className="!bg-primary-600"
            >
              2. Validate Batch
            </Button>
            <Button
              variant="primary"
              icon={CreditCard}
              disabled={!isValidated || actionLoading}
              onClick={handleMarkPaid}
              className="!bg-money-600 hover:!bg-emerald-700 font-bold"
            >
              3. Mark Paid
            </Button>
            <Button
              variant="secondary"
              icon={Mail}
              disabled={!isPaid}
              onClick={handleSendPayslips}
            >
              4. Send Payslips (Email)
            </Button>
          </div>

          {emailSent && (
            <div className="px-3 py-1 rounded-sm bg-money-50 text-money-600 text-xs font-semibold border border-money-600/30">
              ✓ Bulk payslip email delivery initiated for all employees!
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
        emptyMessage="Click 'Compute Salary Rules' above to generate individual payslips for this pay run batch."
      />
    </div>
  );
}

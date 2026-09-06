import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { getPayslipByIdApi } from '../../../api';
import { CurrencyCell } from '../../../components/data/CurrencyCell';
import { StatusBadge } from '../../../components/data/StatusBadge';
import { Button } from '../../../components/ui/Button';
import { PayslipPdfButton } from './PayslipPdfButton';
import { formatDate } from '../../../lib/format';

export function PayslipDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [payslip, setPayslip] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPayslipByIdApi(id)
      .then((res) => {
        setPayslip(res?.data || res);
      })
      .catch((err) => {
        console.error('Failed to load payslip', err);
        navigate('/payroll/payruns');
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading || !payslip) {
    return <div className="p-12 text-center text-ink-600 font-medium">Loading payslip details...</div>;
  }

  const items = payslip.ruleLineItems || [];

  return (
    <div className="flex flex-col gap-6">
      {/* Print styles */}
      <style>{`
        @media print {
          header, nav, button, .no-print { display: none !important; }
          body { background: white !important; color: black !important; }
          .print-card { border: none !important; shadow: none !important; background: white !important; color: black !important; }
          .print-card * { color: black !important; border-color: #ddd !important; }
        }
      `}</style>

      {/* Header Bar */}
      <div className="flex items-center justify-between no-print">
        <div className="flex items-center gap-3">
          <Button variant="secondary" icon={ArrowLeft} onClick={() => navigate(-1)}>
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold font-display text-ink-900">
              Payslip — {payslip.employeeName}
            </h1>
            <p className="text-xs text-ink-600">
              Contract Pay Period: {formatDate(payslip.periodStart)} – {formatDate(payslip.periodEnd)}
              {payslip.contractReference && ` • ${payslip.contractReference}`}
            </p>
          </div>
        </div>
        <PayslipPdfButton payslip={payslip} />
      </div>

      {/* Printable Payslip Statement */}
      <div className="p-8 bg-surface border border-border-strong rounded-[var(--radius-md)] shadow-modal flex flex-col gap-8 print-card">
        {/* Statement Header */}
        <div className="flex items-start justify-between pb-6 border-b border-border">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-sm bg-primary-600 text-surface-sunken flex items-center justify-center font-black text-sm shadow-gold">
                HR
              </div>
              <span className="font-display font-extrabold text-xl text-ink-900">
                PeoplePay360 HR & Payroll
              </span>
            </div>
            <p className="text-xs text-ink-600 mt-1">Official Employment Contract & Salary Statement</p>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-extrabold font-display text-primary-600">PAYSLIP STATEMENT</h2>
            <p className="text-xs text-ink-400 font-mono mt-0.5">{payslip.id}</p>
            <StatusBadge status={payslip.status} className="mt-2" />
          </div>
        </div>

        {/* Employee & Contract Pay Details Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-5 bg-surface-sunken rounded-sm border border-border text-xs">
          <div>
            <span className="text-ink-400 font-medium">Employee Name:</span>
            <p className="font-bold text-ink-900 mt-0.5">
              {payslip.employeeName} {payslip.employee_code && `(${payslip.employee_code})`}
            </p>
          </div>
          <div>
            <span className="text-ink-400 font-medium">Job Position:</span>
            <p className="font-semibold text-ink-900 mt-0.5">{payslip.jobPosition}</p>
          </div>
          <div>
            <span className="text-ink-400 font-medium">Department:</span>
            <p className="font-semibold text-ink-900 mt-0.5">{payslip.department}</p>
          </div>
          <div>
            <span className="text-ink-400 font-medium">Contract Monthly Wage:</span>
            <p className="font-bold text-primary-600 mt-0.5">
              <CurrencyCell amount={payslip.contractWage || payslip.contract_wage || 0} />
            </p>
          </div>
          <div>
            <span className="text-ink-400 font-medium">Contract Reference:</span>
            <p className="font-semibold text-ink-900 mt-0.5 truncate" title={payslip.contractReference || payslip.contract_reference}>
              {payslip.contractReference || payslip.contract_reference || 'Standard Agreement'}
            </p>
          </div>
          <div>
            <span className="text-ink-400 font-medium">Contract Duration:</span>
            <p className="font-semibold text-ink-900 mt-0.5">
              {payslip.contractDuration || 'Active Permanent'}
            </p>
          </div>
          <div>
            <span className="text-ink-400 font-medium">Contract Pay Period:</span>
            <p className="font-bold text-ink-900 mt-0.5">
              {formatDate(payslip.periodStart)} – {formatDate(payslip.periodEnd)}
            </p>
          </div>
          <div>
            <span className="text-ink-400 font-medium">Attendance (09:00 AM – 06:00 PM):</span>
            <p className="font-bold text-ink-900 mt-0.5">
              {payslip.workedDays} days ({payslip.workedHours || Math.round(payslip.workedDays * 8)} hrs)
            </p>
          </div>
        </div>

        {/* Daily Salary Calculation Callout Box (Per Day = Monthly Wage / Days) */}
        <div className="flex flex-wrap items-center justify-between p-4 bg-primary-500/10 border border-primary-500/25 rounded-sm text-xs gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-primary-400 uppercase tracking-wide">Daily Wage Formula:</span>
            <span className="text-ink-300">
              Per Day = <span className="font-mono font-bold text-ink-100"><CurrencyCell amount={payslip.contractWage || payslip.contract_wage || 0} /></span> ÷ <span className="font-bold text-ink-100">{payslip.scheduledWorkDays || 22} scheduled days</span> =
            </span>
            <span className="font-mono font-bold text-primary-400 px-2 py-0.5 bg-primary-500/15 rounded border border-primary-500/30">
              <CurrencyCell amount={payslip.perDayWage || ((payslip.contractWage || payslip.contract_wage || 0) / (payslip.scheduledWorkDays || 22))} /> / day
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-ink-300">
              Days Present: <span className="font-bold text-emerald-400">{payslip.workedDays} days</span>
            </span>
            <span className="text-ink-500">•</span>
            <span className="text-ink-300">
              Earned Salary: <span className="font-mono font-bold text-emerald-400"><CurrencyCell amount={payslip.earnedWage || ((payslip.perDayWage || ((payslip.contractWage || payslip.contract_wage || 0) / (payslip.scheduledWorkDays || 22))) * (payslip.workedDays || 22))} /></span>
            </span>
          </div>
        </div>

        {/* Rule Line Items Computation Breakdown */}
        <div className="flex flex-col gap-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-ink-600">
            Salary Rule Computation Breakdown
          </h3>

          <div className="border border-border rounded-sm overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-surface-muted border-b border-border text-ink-600 font-semibold h-9">
                  <th className="px-4 py-2">Rule Code</th>
                  <th className="px-4 py-2">Salary Component Name</th>
                  <th className="px-4 py-2">Category</th>
                  <th className="px-4 py-2 text-right">Amount (₹ INR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((item, idx) => {
                  const catUpper = String(item.category || '').toUpperCase();
                  const isAllowanceOrBasic = catUpper === 'BASIC' || catUpper === 'ALLOWANCE';
                  const isGrossOrNet = catUpper === 'GROSS' || catUpper === 'NET';
                  return (
                    <tr key={idx} className="h-9 hover:bg-surface-muted/50">
                      <td className="px-4 py-2 font-mono font-semibold text-primary-600">
                        {item.code || item.ruleCode || item.rule_code || '—'}
                      </td>
                      <td className="px-4 py-2 font-semibold text-ink-900">
                        {item.name || item.ruleName || item.rule_name || '—'}
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={`px-2.5 py-0.5 rounded-pill text-[11px] font-bold ${
                            isAllowanceOrBasic
                              ? 'bg-primary-50 text-primary-600 border border-primary-600/30'
                              : isGrossOrNet
                              ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-400/30'
                              : 'bg-rose-950/40 text-rose-400 border border-rose-400/30'
                          }`}
                        >
                          {item.category}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right font-semibold">
                        <CurrencyCell amount={item.amount} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary Footer Box */}
        <div className="pt-4 border-t border-border grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-surface-sunken border border-border rounded-sm">
            <span className="text-xs text-ink-600 font-medium">Basic Salary</span>
            <div className="text-xl font-bold font-display text-ink-900 mt-1">
              <CurrencyCell amount={payslip.basic ?? payslip.basicSalary ?? payslip.contract_wage ?? 0} />
            </div>
          </div>
          <div className="p-4 bg-surface-sunken border border-border rounded-sm">
            <span className="text-xs text-ink-600 font-medium">Total Allowances (+)</span>
            <div className="text-xl font-bold font-display text-primary-600 mt-1">
              <CurrencyCell amount={payslip.allowances ?? payslip.totalAllowances ?? 0} />
            </div>
          </div>
          <div className="p-4 bg-primary-50 border border-primary-600/40 rounded-sm shadow-gold">
            <span className="text-xs text-primary-600 font-bold uppercase tracking-wider">
              Net Payable Salary
            </span>
            <div className="text-2xl font-extrabold font-display text-primary-600 mt-1">
              <CurrencyCell amount={payslip.net ?? payslip.netSalary ?? payslip.net_salary ?? 0} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

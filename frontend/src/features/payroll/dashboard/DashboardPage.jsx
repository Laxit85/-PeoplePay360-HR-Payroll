import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IndianRupee,
  FileCheck,
  TrendingUp,
  CalendarCheck,
  Activity,
  AlertCircle,
  LayoutDashboard,
  Users,
  CheckCircle2,
  FileText,
} from 'lucide-react';
import { getDashboardSummaryApi } from '../../../api';
import { KpiCard } from '../../../components/charts/KpiCard';
import { DeptCostBarChart } from '../../../components/charts/DeptCostBarChart';
import { NetSalaryTrendChart } from '../../../components/charts/NetSalaryTrendChart';
import { StatusDonutChart } from '../../../components/charts/StatusDonutChart';
import { FilterBar } from './FilterBar';
import { formatCurrency, formatRupees } from '../../../lib/format';
import { useAuth } from '../../../auth/useAuth';
import { EmployeeDashboard } from './EmployeeDashboard';
import { TiltCard } from '../../../components/ui/TiltCard';
import { StatusBadge } from '../../../components/data/StatusBadge';

export function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (user?.role === 'EMPLOYEE') {
    return <EmployeeDashboard />;
  }

  if (user?.role === 'HR_MANAGER') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-6 glass-panel rounded-md border border-border">
        <div className="w-16 h-16 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold font-display text-ink-900 mb-2">Payroll Dashboard Restricted</h2>
        <p className="text-sm text-ink-600 max-w-md mb-6">
          The Payroll Dashboard is restricted to Payroll Managers and Administrators. HR role access to this feature has been removed.
        </p>
        <button
          onClick={() => navigate('/employees')}
          className="px-4 py-2 bg-primary-600 text-slate-950 font-bold rounded text-sm hover:bg-primary-500 transition-colors cursor-pointer"
        >
          Go to Employee Directory
        </button>
      </div>
    );
  }

  const [currency] = useState('INR'); // Standardized Indian Rupees (₹)
  const [filters, setFilters] = useState({
    employeeId: 'All',
    department: 'All',
    period: '2026-09',
    employeeType: 'All',
  });

  const [dashData, setDashData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await getDashboardSummaryApi({
        period: filters.period || '2026-09',
        employee_id: filters.employeeId !== 'All' ? filters.employeeId : undefined,
        department_id: filters.department !== 'All' ? filters.department : undefined,
        department: filters.department !== 'All' ? filters.department : undefined,
        employee_type: filters.employeeType !== 'All' ? filters.employeeType : undefined,
      });

      const raw = res.data || res;
      const k = raw.kpis || {};

      setDashData({
        kpis: {
          totalNetPaid: k.totalNetPaid !== undefined ? k.totalNetPaid : 0,
          totalGross: k.totalGross !== undefined ? k.totalGross : 0,
          totalDeductions: k.totalDeductions !== undefined ? k.totalDeductions : 0,
          payslipsGenerated: k.payslipsGenerated !== undefined ? k.payslipsGenerated : 0,
          totalEmployeesPaid: k.totalEmployeesPaid !== undefined ? k.totalEmployeesPaid : 0,
          matchingHeadcount: k.matchingHeadcount !== undefined ? k.matchingHeadcount : 0,
          totalContractBaseWage: k.totalContractBaseWage !== undefined ? k.totalContractBaseWage : 0,
          averageSalary: k.averageSalary !== undefined ? k.averageSalary : 0,
          attendanceHealth: k.attendanceHealth !== undefined ? k.attendanceHealth : 100,
          approvedTimeOffDays: k.approvedTimeOffDays !== undefined ? k.approvedTimeOffDays : 0,
          pendingTimeOffRequests: k.pendingTimeOffRequests !== undefined ? k.pendingTimeOffRequests : 0,
          unresolvedWarnings: k.unresolvedWarnings !== undefined ? k.unresolvedWarnings : 0,
          expiringContractsCount: k.expiringContractsCount !== undefined ? k.expiringContractsCount : 0,
        },
        selectedEmployee: raw.selectedEmployee || null,
        employeePayments: raw.employeePayments || [],
        filterOptions: raw.filterOptions || { employees: [], departments: [], periods: [] },
        alerts: [
          { id: 1, type: 'warning', text: `${k.pendingTimeOffRequests || 0} Pending Time Off Approval Requests` },
          { id: 2, type: 'info', text: `${k.expiringContractsCount || 0} Active Contracts Expiring within 30 Days` },
        ],
        deptCostChart: (raw.departmentCosts || []).map((d) => ({
          department: d.department_name || d.department_code || 'General',
          dept: d.department_name || d.department_code || 'General',
          grossCost: parseFloat(d.gross_cost || 0),
          gross: parseFloat(d.gross_cost || 0),
          netCost: parseFloat(d.net_cost || 0),
          net: parseFloat(d.net_cost || 0),
        })),
        trendChart: (raw.monthlyTrends || []).map((t) => ({
          month: t.name || 'Payrun',
          netPaid: parseFloat(t.total_net || 0),
          netTotal: parseFloat(t.total_net || 0),
        })),
        statusSplitChart: [
          { name: 'On Time', value: k.attendanceHealth || 95 },
          { name: 'On Leave', value: Math.max(1, 100 - (k.attendanceHealth || 95)) },
        ],
      });
    } catch (err) {
      console.error('Failed to fetch dashboard summary', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [filters]);

  const handleResetFilters = () => {
    setFilters({
      employeeId: 'All',
      department: 'All',
      period: '2026-09',
      employeeType: 'All',
    });
  };

  if (loading || !dashData) {
    return (
      <div className="p-12 text-center text-ink-600 font-medium">
        Connecting to employee salary database and computing live metrics...
      </div>
    );
  }

  const { kpis, alerts, deptCostChart, trendChart, statusSplitChart, employeePayments, selectedEmployee, filterOptions } = dashData;

  // Header and Hero Card Context text
  let heroSubtitle = 'All Employee Payments (in Rupees ₹)';
  if (selectedEmployee) {
    heroSubtitle = `${selectedEmployee.name} (${selectedEmployee.code}) • ${selectedEmployee.department}`;
  } else if (filters.department !== 'All') {
    const dName = filterOptions.departments?.find((d) => String(d.id) === String(filters.department))?.name || filters.department;
    heroSubtitle = `${dName} Department`;
  }

  return (
    <div className="flex flex-col gap-6 scroll-reveal">
      {/* Top Header with Standard Currency Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-ink-900 flex items-center gap-2">
            <LayoutDashboard className="w-6 h-6 text-primary-600" />
            <span>Payroll Executive Dashboard</span>
          </h1>
          <p className="text-xs text-ink-600 mt-1">
            Live aggregated KPI metrics and interactive analytics connected to the Employee Salary Database
          </p>
        </div>

        {/* Standard Currency Indicator */}
        <div className="flex items-center gap-2 self-start sm:self-auto bg-surface-muted px-3 py-1.5 rounded-md border border-border">
          <span className="text-xs font-semibold text-ink-500">Currency:</span>
          <span className="px-3 py-1 text-xs font-black rounded-sm bg-[#C5A059] text-slate-950 shadow-sm flex items-center gap-1.5">
            <IndianRupee className="w-3.5 h-3.5" />
            <span>INR (Indian Rupees ₹)</span>
          </span>
        </div>
      </div>

      {/* Live Filter Bar (Filter according to employees, department, period, type) */}
      <FilterBar
        filters={filters}
        setFilters={setFilters}
        filterOptions={filterOptions}
        onReset={handleResetFilters}
      />

      {/* Total Rupees Passed Hero Card */}
      <div className="p-6 rounded-[var(--radius-md)] bg-gradient-to-r from-[#C5A059]/15 via-surface-muted to-[#C5A059]/5 border-2 border-[#C5A059]/40 shadow-gold relative overflow-hidden flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-[#C5A059] text-slate-950 shadow-sm">
              Total Payroll Passed
            </span>
            <span className="text-xs font-bold text-[#C5A059]">
              • {heroSubtitle}
            </span>
          </div>

          <div className="text-3xl sm:text-4xl lg:text-5xl font-black font-display text-ink-900 tracking-tight flex items-baseline gap-2 mt-1">
            <span className="text-[#C5A059] drop-shadow-sm">
              {formatCurrency(kpis.totalNetPaid || 0, currency)}
            </span>
            <span className="text-xs font-bold text-ink-500 font-mono tracking-normal">
              (Total Rupees Passed)
            </span>
          </div>

          <p className="text-xs text-ink-600 mt-1 max-w-xl">
            {selectedEmployee ? (
              <span>
                Net salary passed for <strong>{selectedEmployee.name}</strong>. Contract base salary:{' '}
                <strong>{formatCurrency(selectedEmployee.wage, currency)}</strong>/mo.
              </span>
            ) : (
              'Total net salary successfully passed and processed for filtered employees. Includes all verified payroll line items, allowances, and statutory deductions.'
            )}
          </p>
        </div>

        {/* Breakdown Metric Chips */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full lg:w-auto shrink-0">
          <div className="p-3 bg-surface border border-border rounded-sm text-center">
            <span className="text-[11px] text-ink-500 font-semibold block">Total Gross Passed</span>
            <span className="text-sm font-bold text-ink-900 mt-1 block">
              {formatCurrency(kpis.totalGross || 0, currency)}
            </span>
          </div>

          <div className="p-3 bg-surface border border-border rounded-sm text-center">
            <span className="text-[11px] text-ink-500 font-semibold block">Total Deductions</span>
            <span className="text-sm font-bold text-rose-500 mt-1 block">
              {formatCurrency(kpis.totalDeductions || 0, currency)}
            </span>
          </div>

          <div className="p-3 bg-surface border border-border rounded-sm text-center">
            <span className="text-[11px] text-ink-500 font-semibold block">Employees Paid</span>
            <span className="text-sm font-bold text-emerald-500 mt-1 block">
              {kpis.totalEmployeesPaid || 0} Paid ({kpis.matchingHeadcount || 0} Filtered)
            </span>
          </div>

          <div className="p-3 bg-surface border border-border rounded-sm text-center">
            <span className="text-[11px] text-ink-500 font-semibold block">
              {selectedEmployee ? 'Base Contract Wage' : 'Base Wages Total'}
            </span>
            <span className="text-sm font-bold text-primary-500 mt-1 block">
              {formatCurrency(selectedEmployee ? selectedEmployee.wage : kpis.totalContractBaseWage, currency)}
            </span>
          </div>
        </div>
      </div>

      {/* Alerts Banners Panel */}
      {alerts && alerts.length > 0 && (
        <TiltCard maxTilt={5} scale={1.01} className="p-4 glass-panel rounded-[var(--radius-md)] flex flex-col gap-2 shadow-3d">
          <h3 className="text-xs font-bold uppercase tracking-wider text-ink-600 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            <span>Attention Required & System Alerts ({alerts.length})</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {alerts.map((alt) => (
              <div
                key={alt.id}
                onClick={() => navigate('/payroll/payruns')}
                className={`p-3 rounded-sm text-xs font-semibold flex items-center justify-between border cursor-pointer transition-all hover:scale-[1.02] ${
                  alt.type === 'danger'
                    ? 'bg-danger-50 text-danger-600 border-danger-600/30 hover:bg-danger-50/80 shadow-sm'
                    : alt.type === 'warning'
                    ? 'bg-amber-50 text-amber-600 border-amber-600/30 hover:bg-amber-50/80 shadow-sm'
                    : 'bg-primary-50 text-primary-600 border-primary-600/30 hover:bg-primary-50/80 shadow-sm'
                }`}
              >
                <span>{alt.text}</span>
                <span className="text-[11px] underline shrink-0 ml-2">Review →</span>
              </div>
            ))}
          </div>
        </TiltCard>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
        <KpiCard
          title="Total Net Paid"
          value={formatCurrency(kpis.totalNetPaid || 0, currency)}
          subtext={selectedEmployee ? `${selectedEmployee.name} net pay` : 'Current filtered net total'}
          icon={IndianRupee}
        />
        <KpiCard
          title="Payslips Generated"
          value={kpis.payslipsGenerated}
          subtext="Processed in selected period"
          icon={FileCheck}
        />
        <KpiCard
          title={selectedEmployee ? 'Contract Base Wage' : 'Avg Net / Base Salary'}
          value={formatCurrency(selectedEmployee ? selectedEmployee.wage : kpis.averageSalary, currency)}
          subtext={selectedEmployee ? 'Active contract wage' : 'Per employee monthly'}
          icon={TrendingUp}
        />
        <KpiCard
          title="Approved Leave Days"
          value={`${kpis.approvedTimeOffDays} days`}
          subtext="Approved time off in period"
          icon={CalendarCheck}
        />
        <KpiCard
          title="Attendance Health"
          value={`${kpis.attendanceHealth}%`}
          subtext="Present / On-time ratio"
          icon={Activity}
        />
      </div>

      {/* All Employee Payments Table ("with all there payments" & connected to salary database) */}
      <div className="flex flex-col gap-4 p-5 glass-panel rounded-[var(--radius-md)] border border-border shadow-3d">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-ink-900 flex items-center gap-2">
              <IndianRupee className="w-5 h-5 text-primary-600" />
              <span>
                {selectedEmployee
                  ? `Salary & Payment Records: ${selectedEmployee.name} (${selectedEmployee.code})`
                  : 'All Employee Payments & Salary Disbursements'}
              </span>
            </h3>
            <p className="text-xs text-ink-600 mt-0.5">
              Live records from the Employee Salary Database showing Base Contract Wages, Gross Earnings, Deductions, and Net Take-Home in Rupees (₹).
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-xs font-semibold px-2.5 py-1 rounded bg-primary-600/10 text-primary-500 border border-primary-600/30">
              {employeePayments.length} Employee Record(s)
            </span>
          </div>
        </div>

        {employeePayments.length === 0 ? (
          <div className="p-8 text-center text-xs text-ink-500 bg-surface-sunken rounded-sm border border-border flex flex-col items-center gap-2">
            <span>No employee payment or contract records match the selected filter criteria.</span>
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-xs font-bold text-primary-600 underline cursor-pointer"
            >
              Reset Filters to view all records
            </button>
          </div>
        ) : (
          <div className="border border-border rounded-sm overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-surface-muted border-b border-border text-ink-600 font-semibold h-9">
                  <th className="px-4 py-2">Employee Name</th>
                  <th className="px-4 py-2">Department & Role</th>
                  <th className="px-4 py-2">Pay Run Batch</th>
                  <th className="px-4 py-2 text-right">Base Wage (DB)</th>
                  <th className="px-4 py-2 text-right">Gross Salary</th>
                  <th className="px-4 py-2 text-right">Deductions</th>
                  <th className="px-4 py-2 text-right">Net Amount Passed</th>
                  <th className="px-4 py-2 text-center">Status</th>
                  <th className="px-4 py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {employeePayments.map((p) => {
                  const isPaid = p.status === 'PAID';
                  const hasPayslip = Boolean(p.payslip_id);

                  return (
                    <tr key={`${p.employee_id}-${p.payslip_id || 'none'}`} className="h-11 hover:bg-surface-muted/50 transition-colors">
                      <td className="px-4 py-2">
                        <span className="font-bold text-ink-900">{p.first_name} {p.last_name}</span>
                        <p className="text-[11px] text-ink-500 font-mono">{p.employee_code}</p>
                      </td>
                      <td className="px-4 py-2">
                        <span className="text-ink-900 font-medium">{p.department_name || 'General'}</span>
                        <p className="text-[11px] text-ink-500">{p.job_position_title || 'Staff'}</p>
                      </td>
                      <td className="px-4 py-2 font-medium text-ink-800">
                        {p.payrun_name || 'Pending Pay Run'}
                      </td>
                      <td className="px-4 py-2 text-right font-bold text-ink-900">
                        {formatCurrency(p.contract_wage || 0, currency)}
                      </td>
                      <td className="px-4 py-2 text-right font-semibold text-ink-900">
                        {hasPayslip ? formatCurrency(p.gross_salary, currency) : '—'}
                      </td>
                      <td className="px-4 py-2 text-right font-semibold text-rose-500">
                        {hasPayslip ? formatCurrency(p.total_deductions, currency) : '—'}
                      </td>
                      <td className="px-4 py-2 text-right font-extrabold text-sm">
                        {hasPayslip ? (
                          <span className="text-emerald-500">{formatCurrency(p.net_salary, currency)}</span>
                        ) : (
                          <span className="text-ink-400 font-normal">
                            ₹0.00 <span className="text-[10px] text-ink-500 block">(Base: {formatCurrency(p.contract_wage, currency)})</span>
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-center">
                        {isPaid ? (
                          <StatusBadge status="PAID" />
                        ) : p.status === 'ACTIVE_CONTRACT' ? (
                          <span className="px-2 py-0.5 rounded-pill text-[11px] font-bold bg-blue-50 text-blue-600 border border-blue-600/30">
                            Active Contract
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-pill text-[11px] font-bold bg-amber-50 text-amber-600 border border-amber-600/30">
                            {p.status}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {hasPayslip ? (
                          <button
                            type="button"
                            onClick={() => navigate(`/payroll/payslips/${p.payslip_id}`)}
                            className="px-2.5 py-1 text-xs font-bold bg-[#C5A059]/15 hover:bg-[#C5A059] text-primary-500 hover:text-slate-950 rounded-sm transition-all border border-[#C5A059]/30 cursor-pointer"
                          >
                            View Statement →
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => navigate(`/contracts`)}
                            className="px-2.5 py-1 text-xs font-bold bg-surface-muted hover:bg-surface-sunken text-ink-600 hover:text-ink-900 rounded-sm transition-all border border-border cursor-pointer"
                          >
                            View Contract →
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Department Salary Cost Bar Chart */}
        <TiltCard maxTilt={6} scale={1.01} className="lg:col-span-2 p-5 glass-panel rounded-[var(--radius-md)] flex flex-col gap-4 shadow-3d">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-ink-900">Salary Gross Cost by Department</h3>
              <p className="text-xs text-ink-600">Departmental breakdown of monthly gross wage in Rupees (₹)</p>
            </div>
            <span className="text-xs font-semibold text-primary-600 px-2 py-0.5 rounded bg-primary-600/10 border border-primary-600/20">Bar Chart</span>
          </div>
          <DeptCostBarChart data={deptCostChart} currency={currency} />
        </TiltCard>

        {/* Payslip Status Split Donut Chart */}
        <TiltCard maxTilt={6} scale={1.01} className="p-5 glass-panel rounded-[var(--radius-md)] flex flex-col gap-4 shadow-3d">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-ink-900">Attendance Ratio</h3>
              <p className="text-xs text-ink-600">On Time vs Leave Split</p>
            </div>
            <span className="text-xs font-semibold text-money-600 px-2 py-0.5 rounded bg-money-50 border border-money-600/20">Donut</span>
          </div>
          <StatusDonutChart data={statusSplitChart} />
        </TiltCard>
      </div>

      {/* Monthly Net Salary Trend Chart */}
      <TiltCard maxTilt={6} scale={1.01} className="p-5 glass-panel rounded-[var(--radius-md)] flex flex-col gap-4 shadow-3d">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-ink-900">Monthly Net Salary Trend (5 Months)</h3>
            <p className="text-xs text-ink-600">Historical net salary disbursement progression</p>
          </div>
          <span className="text-xs font-semibold text-money-600 px-2 py-0.5 rounded bg-money-50 border border-money-600/20">Line Trend</span>
        </div>
        <NetSalaryTrendChart data={trendChart} currency={currency} />
      </TiltCard>
    </div>
  );
}

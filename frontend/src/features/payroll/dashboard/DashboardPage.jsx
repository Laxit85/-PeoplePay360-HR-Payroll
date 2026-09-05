import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DollarSign,
  FileCheck,
  TrendingUp,
  CalendarCheck,
  Activity,
  AlertCircle,
  LayoutDashboard,
} from 'lucide-react';
import { getDashboardData } from '../../../mockApi/apiHandlers';
import { KpiCard } from '../../../components/charts/KpiCard';
import { DeptCostBarChart } from '../../../components/charts/DeptCostBarChart';
import { NetSalaryTrendChart } from '../../../components/charts/NetSalaryTrendChart';
import { StatusDonutChart } from '../../../components/charts/StatusDonutChart';
import { FilterBar } from './FilterBar';
import { formatCurrency } from '../../../lib/format';

export function DashboardPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({
    period: '2026-09',
    department: 'All',
    employeeType: 'All',
    company: 'All',
  });

  const [dashData, setDashData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const data = await getDashboardData(filters);
      setDashData(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [filters]);

  if (loading || !dashData) {
    return <div className="p-12 text-center text-ink-600 font-medium">Aggregating live payroll & HR data metrics...</div>;
  }

  const { kpis, alerts, deptCostChart, trendChart, statusSplitChart } = dashData;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold font-display text-ink-900 flex items-center gap-2">
          <LayoutDashboard className="w-6 h-6 text-primary-600" />
          <span>Payroll Executive Dashboard</span>
        </h1>
        <p className="text-xs text-ink-600 mt-1">
          Live aggregated KPI metrics and interactive analytics across Payroll, Attendance, and Time Off
        </p>
      </div>

      {/* Filter Bar */}
      <FilterBar filters={filters} setFilters={setFilters} />

      {/* Alerts Banners Panel (§5.7) */}
      {alerts && alerts.length > 0 && (
        <div className="p-4 bg-surface border border-border rounded-[var(--radius-md)] flex flex-col gap-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-ink-600 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            <span>Attention Required & System Alerts ({alerts.length})</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {alerts.map((alt) => (
              <div
                key={alt.id}
                onClick={() => navigate('/payroll/payruns')}
                className={`p-3 rounded-sm text-xs font-semibold flex items-center justify-between border cursor-pointer transition-colors ${
                  alt.type === 'danger'
                    ? 'bg-danger-50 text-danger-600 border-danger-600/30 hover:bg-danger-50/80'
                    : alt.type === 'attention'
                    ? 'bg-amber-50 text-amber-600 border-amber-600/30 hover:bg-amber-50/80'
                    : 'bg-primary-50 text-primary-600 border-primary-600/30 hover:bg-primary-50/80'
                }`}
              >
                <span>{alt.text}</span>
                <span className="text-[11px] underline shrink-0 ml-2">Review →</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
        <KpiCard
          title="Total Net Paid"
          value={formatCurrency(kpis.totalNetPaid)}
          subtext="Current pay period net total"
          icon={DollarSign}
        />
        <KpiCard
          title="Payslips Generated"
          value={kpis.payslipsGenerated}
          subtext="Paid vs Pending status split"
          icon={FileCheck}
        />
        <KpiCard
          title="Avg Salary / Employee"
          value={formatCurrency(kpis.avgSalary)}
          subtext="Average net monthly wage"
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
          value={`${kpis.attHealth}%`}
          subtext="Present / On-time ratio"
          icon={Activity}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Department Salary Cost Bar Chart */}
        <div className="lg:col-span-2 p-5 bg-surface border border-border rounded-[var(--radius-md)] flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-ink-900">Salary Gross Cost by Department</h3>
              <p className="text-xs text-ink-600">Departmental breakdown of monthly gross wage</p>
            </div>
            <span className="text-xs font-semibold text-primary-600">Bar Chart</span>
          </div>
          <DeptCostBarChart data={deptCostChart} />
        </div>

        {/* Payslip Status Split Donut Chart */}
        <div className="p-5 bg-surface border border-border rounded-[var(--radius-md)] flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-ink-900">Payslip Status Split</h3>
              <p className="text-xs text-ink-600">Paid, Validated, Computed & Warnings</p>
            </div>
            <span className="text-xs font-semibold text-money-600">Donut</span>
          </div>
          <StatusDonutChart data={statusSplitChart} />
        </div>
      </div>

      {/* Monthly Net Salary Trend Chart */}
      <div className="p-5 bg-surface border border-border rounded-[var(--radius-md)] flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-ink-900">Monthly Net Salary Trend (5 Months)</h3>
            <p className="text-xs text-ink-600">Historical net salary disbursement progression</p>
          </div>
          <span className="text-xs font-semibold text-money-600">Line Trend</span>
        </div>
        <NetSalaryTrendChart data={trendChart} />
      </div>
    </div>
  );
}

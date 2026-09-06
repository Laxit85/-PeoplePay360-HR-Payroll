import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Clock,
  Calendar,
  IndianRupee,
  Download,
  FileText,
  CheckCircle,
  AlertCircle,
  ArrowUpRight,
  User,
  Shield,
} from 'lucide-react';
import {
  clockInOutApi,
  getAttendanceLogsApi,
  getTimeOffAllocationsApi,
  createTimeOffRequestApi,
  getMyLatestPayslipApi,
  getPayslipPdfUrl,
  downloadPayslipPdfApi,
} from '../../../api';
import { Button } from '../../../components/ui/Button';
import { StatusBadge } from '../../../components/data/StatusBadge';
import { TiltCard } from '../../../components/ui/TiltCard';
import { Modal } from '../../../components/ui/Modal';
import { Select } from '../../../components/ui/Select';
import { Input } from '../../../components/ui/Input';
import { formatCurrency, formatDate } from '../../../lib/format';
import { useAuth } from '../../../auth/useAuth';

export function EmployeeDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [attendanceToday, setAttendanceToday] = useState(null);
  const [clockLoading, setClockLoading] = useState(false);
  const [allocations, setAllocations] = useState([]);
  const [recentAttendance, setRecentAttendance] = useState([]);
  const [latestPayslip, setLatestPayslip] = useState(null);
  const [activeContract, setActiveContract] = useState(null);
  const [loading, setLoading] = useState(true);

  // Leave Request Pop-up State (Strictly Paid Annual Leave or Paid Sick Leave)
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [leaveTypeId, setLeaveTypeId] = useState(1);
  const [leaveStartDate, setLeaveStartDate] = useState('2026-09-15');
  const [leaveEndDate, setLeaveEndDate] = useState('2026-09-17');
  const [leaveDays, setLeaveDays] = useState(3);
  const [leaveReason, setLeaveReason] = useState('');
  const [leaveSubmitting, setLeaveSubmitting] = useState(false);
  const [leaveError, setLeaveError] = useState('');
  const [leaveSuccess, setLeaveSuccess] = useState('');

  const fetchEmployeeDashboardData = async () => {
    setLoading(true);
    try {
      const [attRes, allocRes, payRes] = await Promise.all([
        getAttendanceLogsApi().catch(() => ({ data: [] })),
        getTimeOffAllocationsApi().catch(() => ({ data: [] })),
        getMyLatestPayslipApi().catch(() => ({ data: null, contract: null })),
      ]);

      const attList = attRes?.data || attRes || [];
      setRecentAttendance(attList.slice(0, 5));

      // 1. Check if there is an active open session (check_out is null)
      const openSession = attList.find((a) => !a.check_out);

      // 2. Or today's latest record
      const todayStr = new Date().toISOString().split('T')[0];
      const todayRecord = openSession || attList.find((a) => {
        const dStr = a.attendance_date ? new Date(a.attendance_date).toISOString().split('T')[0] : '';
        return dStr === todayStr;
      }) || attList[0] || null;

      setAttendanceToday(openSession || todayRecord);

      const allocList = allocRes?.data || allocRes || [];
      setAllocations(allocList);

      const slipData = payRes?.data || null;
      const contractData = payRes?.contract || null;
      setLatestPayslip(slipData);
      setActiveContract(contractData);
    } catch (err) {
      console.error('Failed to load employee dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployeeDashboardData();
  }, [user]);

  const [elapsedTime, setElapsedTime] = useState('00:00:00');

  useEffect(() => {
    if (!attendanceToday || attendanceToday.check_out || !attendanceToday.check_in) return;
    const updateElapsed = () => {
      const start = new Date(attendanceToday.check_in).getTime();
      const now = new Date().getTime();
      const diffMs = Math.max(0, now - start);
      const hours = String(Math.floor(diffMs / (1000 * 60 * 60))).padStart(2, '0');
      const mins = String(Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))).padStart(2, '0');
      const secs = String(Math.floor((diffMs % (1000 * 60)) / 1000)).padStart(2, '0');
      setElapsedTime(`${hours}:${mins}:${secs}`);
    };
    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [attendanceToday]);

  const handleToggleClock = async () => {
    setClockLoading(true);
    try {
      const targetEmpId = user?.employeeId || 1;
      await clockInOutApi({ employee_id: targetEmpId });
      await fetchEmployeeDashboardData();
    } catch (err) {
      alert(err?.response?.data?.message || err.message || 'Clock toggle failed');
    } finally {
      setClockLoading(false);
    }
  };

  const isCheckedIn = Boolean(attendanceToday && !attendanceToday.check_out);

  const annualLeave = allocations.find(
    (a) =>
      a.time_off_type_name?.toLowerCase().includes('annual') ||
      a.type_name?.toLowerCase().includes('annual') ||
      a.time_off_type_id === 1
  );
  const sickLeave = allocations.find(
    (a) =>
      a.time_off_type_name?.toLowerCase().includes('sick') ||
      a.type_name?.toLowerCase().includes('sick') ||
      a.time_off_type_id === 2
  );

  const handleOpenLeaveModal = (typeId = 1) => {
    setLeaveTypeId(typeId);
    setLeaveError('');
    setLeaveSuccess('');
    setIsLeaveModalOpen(true);
  };

  const handleSubmitLeave = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setLeaveError('');
    setLeaveSuccess('');

    const targetEmpId = user?.employeeId || 1;
    if (!leaveStartDate || !leaveEndDate) {
      setLeaveError('Please choose start and end dates.');
      return;
    }

    setLeaveSubmitting(true);
    try {
      await createTimeOffRequestApi({
        employee_id: Number(targetEmpId),
        time_off_type_id: Number(leaveTypeId),
        date_from: leaveStartDate,
        date_to: leaveEndDate,
        duration: Number(leaveDays) || 1,
        reason: leaveReason || ''
      });
      setLeaveSuccess('Leave request submitted! It will deduct from your balance upon manager approval.');
      setLeaveReason('');
      await fetchEmployeeDashboardData();
      setTimeout(() => {
        setIsLeaveModalOpen(false);
        setLeaveSuccess('');
      }, 1200);
    } catch (err) {
      console.error('Failed to submit leave request', err);
      setLeaveError(err?.response?.data?.message || err.message || 'Error submitting leave request');
    } finally {
      setLeaveSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 scroll-reveal">
      {/* Welcome Greeting Banner */}
      <div className="glass-panel p-6 rounded-[var(--radius-lg)] border border-primary-600/30 bg-gradient-to-r from-primary-600/10 via-surface to-surface flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-3d">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-primary-600 text-surface-sunken flex items-center justify-center font-bold text-xl shadow-gold">
            {(user?.name || 'E').charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold font-display text-ink-900">
              Welcome, {user?.name?.split(' ')[0] || 'Employee'}! 👋
            </h1>
            <p className="text-xs text-ink-600 mt-0.5">
              Personal Self-Service Portal • Role:{' '}
              <span className="font-bold text-primary-600">{user?.role || 'EMPLOYEE'}</span> • ID:{' '}
              <code>{user?.employeeCode || `EMP-${user?.id || 1}`}</code>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {user?.employeeId && (
            <Button
              variant="secondary"
              icon={User}
              onClick={() => navigate(`/employees/${user.employeeId}`)}
            >
              My Full Profile
            </Button>
          )}
          <Button
            variant="primary"
            icon={Calendar}
            onClick={() => handleOpenLeaveModal(1)}
          >
            Request Leave
          </Button>
        </div>
      </div>

      {/* Core 3 Cards: Today's Attendance, Leave Balances, Latest Payslip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 1. Today's Attendance Card */}
        <TiltCard
          maxTilt={6}
          scale={1.01}
          className="p-5 glass-panel rounded-[var(--radius-md)] flex flex-col justify-between gap-4 border border-border shadow-3d"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-ink-600 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-primary-600" />
                <span>Today's Attendance</span>
              </span>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-pill text-xs font-bold ${
                  isCheckedIn
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'bg-surface-muted text-ink-600 border border-border'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${isCheckedIn ? 'bg-emerald-400 animate-pulse' : 'bg-ink-400'}`} />
                {isCheckedIn ? 'Clocked In' : 'Clocked Out'}
              </span>
            </div>

            <div className="mt-4">
              <div className="text-3xl font-black font-display text-ink-900 tracking-tight">
                {isCheckedIn
                  ? elapsedTime
                  : attendanceToday?.check_in
                  ? new Date(attendanceToday.check_in).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '09:00 AM'}
              </div>
              <p className="text-xs text-ink-600 mt-1">
                {isCheckedIn
                  ? `Active session started at ${new Date(attendanceToday.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Click button below to check out.`
                  : 'Shift schedule: 09:00 AM – 06:00 PM (8.0 planned hours)'}
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-border flex items-center justify-between gap-2">
            <Button
              variant={isCheckedIn ? 'destructive' : 'primary'}
              onClick={handleToggleClock}
              disabled={clockLoading}
              className={`w-full font-bold !h-10 text-sm shadow-md transition-all cursor-pointer ${
                isCheckedIn
                  ? '!bg-rose-600 hover:!bg-rose-700 text-white border-rose-700'
                  : '!bg-emerald-600 hover:!bg-emerald-700 text-white border-emerald-700'
              }`}
            >
              {clockLoading
                ? 'Processing...'
                : isCheckedIn
                ? 'Check Out (Clock Out Now)'
                : 'Check In (Clock Now)'}
            </Button>
          </div>
        </TiltCard>

        {/* 2. Leave Balance Card */}
        <TiltCard
          maxTilt={6}
          scale={1.01}
          className="p-5 glass-panel rounded-[var(--radius-md)] flex flex-col justify-between gap-4 border border-border shadow-3d"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-ink-600 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-primary-600" />
                <span>Leave Balance</span>
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/timeoff/requests')}
                className="text-primary-600 text-xs font-semibold"
              >
                View History →
              </Button>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3">
              <div
                onClick={() => handleOpenLeaveModal(1)}
                className="p-3 bg-surface-muted rounded-sm border border-border cursor-pointer hover:border-primary-500/50 hover:bg-surface transition-all group"
                title="Click to request Paid Annual Leave"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-ink-600 block truncate" title="Paid Annual Leave">
                    Paid Annual Leave
                  </span>
                  <span className="text-[10px] text-primary-500 opacity-0 group-hover:opacity-100 transition-opacity font-semibold">Apply +</span>
                </div>
                <span className="text-2xl font-black text-ink-900">
                  {annualLeave != null
                    ? Math.round(annualLeave.remaining_days != null ? annualLeave.remaining_days : annualLeave.allocated_days)
                    : 20}
                </span>
                <span className="text-xs text-ink-400 ml-1">days left</span>
              </div>
              <div
                onClick={() => handleOpenLeaveModal(2)}
                className="p-3 bg-surface-muted rounded-sm border border-border cursor-pointer hover:border-primary-500/50 hover:bg-surface transition-all group"
                title="Click to request Paid Sick Leave"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-ink-600 block truncate" title="Paid Sick Leave">
                    Paid Sick Leave
                  </span>
                  <span className="text-[10px] text-primary-500 opacity-0 group-hover:opacity-100 transition-opacity font-semibold">Apply +</span>
                </div>
                <span className="text-2xl font-black text-ink-900">
                  {sickLeave != null
                    ? Math.round(sickLeave.remaining_days != null ? sickLeave.remaining_days : sickLeave.allocated_days)
                    : 10}
                </span>
                <span className="text-xs text-ink-400 ml-1">days left</span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-border flex items-center justify-between">
            <span className="text-xs text-ink-600">Deductions apply on approval</span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleOpenLeaveModal(1)}
            >
              New Request
            </Button>
          </div>
        </TiltCard>

        {/* 3. Latest Payslip Card */}
        <TiltCard
          maxTilt={6}
          scale={1.01}
          className="p-5 glass-panel rounded-[var(--radius-md)] flex flex-col justify-between gap-4 border border-border shadow-3d"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-ink-600 flex items-center gap-1.5">
                <IndianRupee className="w-4 h-4 text-emerald-400" />
                <span>Latest Payslip</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-pill bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs font-bold">
                {latestPayslip?.period_start
                  ? new Date(latestPayslip.period_start).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                  : 'September 2026'}
              </span>
            </div>

            <div className="mt-4">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black font-display text-emerald-400">
                  {formatCurrency(latestPayslip ? latestPayslip.net_salary : (activeContract?.wage || 0))}
                </span>
                <span className="text-xs font-semibold uppercase px-2 py-0.5 rounded bg-surface-muted text-ink-600 border border-border">
                  {latestPayslip?.status || (activeContract ? 'ACTIVE CONTRACT' : 'DRAFT')}
                </span>
              </div>

              <div className="mt-2 pt-2 border-t border-border/60 flex flex-col gap-1 text-xs">
                <div className="flex items-center justify-between text-ink-600">
                  <span>Contract Monthly Wage:</span>
                  <span className="font-bold text-ink-900">
                    {formatCurrency(latestPayslip?.contract_wage || activeContract?.wage || 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-ink-600">
                  <span>Daily Salary Rate:</span>
                  <span className="font-semibold text-ink-900">
                    {formatCurrency(
                      ((latestPayslip?.contract_wage || activeContract?.wage || 0) /
                        (latestPayslip?.scheduled_work_days || 22)).toFixed(2)
                    )} / day ({latestPayslip?.scheduled_work_days || 22} sched)
                  </span>
                </div>
                <p className="text-[11px] text-ink-500 mt-1">
                  Net Salary disbursed • {latestPayslip?.worked_days || 22} worked days credited • {Number(latestPayslip?.unpaid_leave_days || 0) > 0 ? `${latestPayslip.unpaid_leave_days} unpaid leaves` : 'Zero unpaid leaves'}
                </p>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-border flex items-center gap-2">
            <Button
              variant="secondary"
              icon={Download}
              size="sm"
              className="flex-1"
              disabled={!latestPayslip}
              onClick={() => {
                if (latestPayslip?.id) {
                  downloadPayslipPdfApi(latestPayslip.id, `Payslip_${user?.name?.replace(/\s+/g, '_') || 'Statement'}.pdf`);
                }
              }}
            >
              Download PDF
            </Button>
            <Button
              variant="primary"
              icon={FileText}
              size="sm"
              className="flex-1 !bg-[#C5A059] !text-slate-950 font-bold hover:!bg-[#b38e36]"
              disabled={!latestPayslip}
              onClick={() => {
                if (latestPayslip?.id) {
                  navigate(`/payroll/payslips/${latestPayslip.id}`);
                }
              }}
            >
              View Breakdown
            </Button>
          </div>
        </TiltCard>
      </div>

      {/* Recent Attendance Logs */}
      <div className="glass-panel p-5 rounded-[var(--radius-md)] border border-border flex flex-col gap-4 shadow-3d">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-ink-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary-600" />
              <span>My Recent Attendance Records</span>
            </h3>
            <p className="text-xs text-ink-600 mt-0.5">
              Live automated check-in and check-out logs calculated from your schedule
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/attendance')}
            className="text-primary-600 text-xs font-semibold"
          >
            All Logs →
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border text-ink-400 font-semibold uppercase tracking-wider">
                <th className="py-2 px-3">Date</th>
                <th className="py-2 px-3">Check In</th>
                <th className="py-2 px-3">Check Out</th>
                <th className="py-2 px-3">Worked Hours</th>
                <th className="py-2 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {recentAttendance.length > 0 ? (
                recentAttendance.map((rec) => (
                  <tr key={rec.id} className="hover:bg-surface-muted transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-ink-900">
                      {formatDate(rec.attendance_date || rec.work_date || '2026-09-01')}
                    </td>
                    <td className="py-2.5 px-3 text-ink-900 font-mono">
                      {rec.check_in
                        ? new Date(rec.check_in).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '09:02 AM'}
                    </td>
                    <td className="py-2.5 px-3 text-ink-900 font-mono">
                      {rec.check_out ? (
                        new Date(rec.check_out).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      ) : (
                        <span className="text-emerald-400 font-semibold text-xs animate-pulse">
                          ● Active Session
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-ink-900">
                      {rec.check_out ? `${rec.worked_hours || '0.0'} hrs` : 'In Progress'}
                    </td>
                    <td className="py-2.5 px-3">
                      <StatusBadge status={rec.check_out ? (rec.status || 'ON_TIME') : 'PRESENT'} />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-ink-400">
                    No attendance records found. Clock in above to start your day!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pop-up Modal: Request Leave (strictly Paid Annual Leave or Paid Sick Leave) */}
      <Modal
        isOpen={isLeaveModalOpen}
        onClose={() => setIsLeaveModalOpen(false)}
        title="Request Leave"
        footer={
          <div className="flex items-center justify-end gap-3 w-full">
            <Button variant="secondary" onClick={() => setIsLeaveModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="employee-leave-form"
              variant="primary"
              disabled={leaveSubmitting}
              className="!bg-[#C5A059] !text-slate-950 font-bold hover:!bg-[#b38e36]"
            >
              {leaveSubmitting ? 'Submitting...' : 'Submit Request'}
            </Button>
          </div>
        }
      >
        {leaveError && (
          <div className="mb-4 p-3.5 rounded-md bg-danger-500/15 border border-danger-500/40 text-xs font-semibold text-danger-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-danger-400" />
            <span>{leaveError}</span>
          </div>
        )}

        {leaveSuccess && (
          <div className="mb-4 p-3.5 rounded-md bg-emerald-500/15 border border-emerald-500/40 text-xs font-semibold text-emerald-300 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{leaveSuccess}</span>
          </div>
        )}

        <form id="employee-leave-form" onSubmit={handleSubmitLeave} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-ink-600">Employee</label>
            <div className="px-3 py-2 rounded border border-border bg-surface-sunken text-sm text-ink-900 font-medium">
              {user?.name || 'Current Employee'} {user?.employeeCode ? `(${user?.employeeCode})` : ''}
            </div>
          </div>

          <Select
            label="Leave Type"
            value={leaveTypeId}
            onChange={(e) => setLeaveTypeId(Number(e.target.value))}
          >
            <option value={1}>
              Paid Annual Leave ({annualLeave ? Math.round(annualLeave.remaining_days ?? annualLeave.allocated_days) : 20} days remaining)
            </option>
            <option value={2}>
              Paid Sick Leave ({sickLeave ? Math.round(sickLeave.remaining_days ?? sickLeave.allocated_days) : 7} days remaining)
            </option>
          </Select>

          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Start Date"
              type="date"
              value={leaveStartDate}
              onChange={(e) => {
                const val = e.target.value;
                setLeaveStartDate(val);
                if (val && leaveEndDate) {
                  const d1 = new Date(val);
                  const d2 = new Date(leaveEndDate);
                  const diff = Math.max(1, Math.round((d2 - d1) / (1000 * 60 * 60 * 24)) + 1);
                  if (!isNaN(diff) && diff > 0) setLeaveDays(diff);
                }
              }}
              required
            />
            <Input
              label="End Date"
              type="date"
              value={leaveEndDate}
              onChange={(e) => {
                const val = e.target.value;
                setLeaveEndDate(val);
                if (leaveStartDate && val) {
                  const d1 = new Date(leaveStartDate);
                  const d2 = new Date(val);
                  const diff = Math.max(1, Math.round((d2 - d1) / (1000 * 60 * 60 * 24)) + 1);
                  if (!isNaN(diff) && diff > 0) setLeaveDays(diff);
                }
              }}
              required
            />
            <Input
              label="Number of Days"
              type="number"
              min="1"
              value={leaveDays}
              onChange={(e) => setLeaveDays(e.target.value)}
              required
            />
          </div>

          <Input
            label="Reason / Notes"
            value={leaveReason}
            onChange={(e) => setLeaveReason(e.target.value)}
            placeholder="Reason for leave"
            required
          />
        </form>
      </Modal>
    </div>
  );
}

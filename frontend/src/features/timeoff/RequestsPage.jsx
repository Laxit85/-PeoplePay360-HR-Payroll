import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Calendar, AlertCircle } from 'lucide-react';
import {
  getTimeOffRequestsApi,
  getTimeOffTypesApi,
  createTimeOffRequestApi,
  updateTimeOffStatusApi,
  getEmployeesApi,
} from '../../api';
import { DataTable } from '../../components/data/DataTable';
import { StatusBadge } from '../../components/data/StatusBadge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { ApproveRefuseButtons } from './components/ApproveRefuseButtons';
import { formatDate } from '../../lib/format';
import { useAuth } from '../../auth/useAuth';

export function RequestsPage() {
  const [searchParams] = useSearchParams();
  const empFilter = searchParams.get('employeeId');

  const { user, can } = useAuth();
  const [requests, setRequests] = useState([]);
  const [types, setTypes] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [employeeId, setEmployeeId] = useState(user?.employeeId || 1);
  const [timeOffTypeId, setTimeOffTypeId] = useState('');
  const [startDate, setStartDate] = useState('2026-09-15');
  const [endDate, setEndDate] = useState('2026-09-17');
  const [numberOfDays, setNumberOfDays] = useState(3);
  const [reason, setReason] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [rRes, tRes, eRes] = await Promise.all([
        getTimeOffRequestsApi({ employee_id: empFilter }),
        getTimeOffTypesApi(),
        getEmployeesApi(),
      ]);

      const rawReqs = rRes?.data || rRes || [];
      const rawTypes = tRes?.data || tRes || [];
      const rawEmps = eRes?.data || eRes || [];

      const formattedReqs = rawReqs.map((r) => ({
        id: r.id,
        employeeId: r.employee_id,
        employeeName: r.first_name ? `${r.first_name} ${r.last_name || ''}`.trim() : (r.employee_name || 'Employee'),
        timeOffTypeId: r.time_off_type_id,
        timeOffTypeName: r.time_off_type_name || r.time_off_type_code || 'General Leave',
        typeName: r.time_off_type_name || r.time_off_type_code || 'General Leave',
        startDate: r.date_from || r.start_date,
        endDate: r.date_to || r.end_date,
        numberOfDays: r.duration != null ? Number(r.duration) : (r.requested_days || 1),
        status: String(r.status || 'SUBMITTED').toUpperCase(),
        reason: r.reason || '—'
      }));

      const formattedEmps = rawEmps.map((e) => ({
        id: e.id,
        name: e.first_name ? `${e.first_name} ${e.last_name || ''}`.trim() : 'Employee',
        code: e.employee_code || `EMP-${e.id}`,
        department: e.department_name || 'General'
      }));

      // Restrict strictly to Paid Annual Leave and Paid Sick Leave only
      const allowedTypes = rawTypes.filter(
        (t) =>
          Number(t.id) === 1 ||
          Number(t.id) === 2 ||
          t.name.toLowerCase().includes('annual') ||
          t.name.toLowerCase().includes('sick')
      );
      const displayTypes = allowedTypes.length ? allowedTypes : [
        { id: 1, name: 'Paid Annual Leave', code: 'PTO' },
        { id: 2, name: 'Paid Sick Leave', code: 'SICK' },
      ];

      setRequests(formattedReqs);
      setTypes(displayTypes);
      setEmployees(formattedEmps);
      if (displayTypes.length) setTimeOffTypeId(displayTypes[0].id);
      if (formattedEmps.length && !employeeId) {
        setEmployeeId(user?.role === 'EMPLOYEE' && user?.employeeId ? user.employeeId : formattedEmps[0].id);
      }
    } catch (err) {
      console.error('Failed to load leave requests', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [empFilter]);

  const handleCreate = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setErrorMessage('');

    const targetEmpId = (user?.role === 'EMPLOYEE' && user?.employeeId) ? user.employeeId : employeeId;

    if (!targetEmpId) {
      setErrorMessage('Please select an employee.');
      return;
    }
    if (!timeOffTypeId) {
      setErrorMessage('Please select a time off type.');
      return;
    }
    if (!startDate || !endDate) {
      setErrorMessage('Please choose start and end dates.');
      return;
    }

    setSaving(true);
    try {
      await createTimeOffRequestApi({
        employee_id: Number(targetEmpId),
        time_off_type_id: Number(timeOffTypeId),
        date_from: startDate,
        date_to: endDate,
        duration: Number(numberOfDays) || 1,
        reason: reason || ''
      });
      setIsModalOpen(false);
      setReason('');
      await fetchData();
    } catch (err) {
      console.error('Failed to submit leave request', err);
      setErrorMessage(err?.response?.data?.message || err.message || 'Error submitting request');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await updateTimeOffStatusApi(id, { status });
      await fetchData();
    } catch (err) {
      alert(err?.response?.data?.message || err.message || 'Error updating status');
    }
  };

  const canApprove =
    user?.role === 'ADMIN' ||
    user?.role === 'HR_MANAGER' ||
    user?.role === 'HR_PAYROLL_MANAGER' ||
    can('timeoff.approve');

  const columns = [
    { key: 'employeeName', header: 'Employee' },
    { key: 'typeName', header: 'Time Off Type' },
    { key: 'startDate', header: 'Start Date', render: (val) => formatDate(val) },
    { key: 'endDate', header: 'End Date', render: (val) => formatDate(val) },
    {
      key: 'numberOfDays',
      header: 'Days',
      align: 'center',
      render: (val) => <span className="font-bold">{val} days</span>,
    },
    { key: 'reason', header: 'Reason' },
    { key: 'status', header: 'Status', render: (val) => <StatusBadge status={val} /> },
    ...(canApprove
      ? [
          {
            key: 'actions',
            header: 'Review Action',
            align: 'right',
            render: (_, row) => {
              const statusUpper = String(row.status || '').toUpperCase();
              if (['SUBMITTED', 'PENDING', 'TO APPROVE', 'DRAFT'].includes(statusUpper)) {
                return (
                  <ApproveRefuseButtons
                    onApprove={() => handleStatusChange(row.id, 'APPROVED')}
                    onRefuse={() => handleStatusChange(row.id, 'REFUSED')}
                  />
                );
              }
              if (statusUpper === 'APPROVED') {
                return (
                  <div className="flex items-center justify-end gap-2">
                    <span className="text-xs text-emerald-400 font-semibold px-2.5 py-1 rounded bg-emerald-500/15 border border-emerald-500/30">
                      Approved
                    </span>
                    <button
                      onClick={() => handleStatusChange(row.id, 'REFUSED')}
                      className="text-xs text-rose-400 hover:text-rose-300 hover:underline px-1.5 py-0.5 font-medium transition-colors"
                      title="Change status to Refused"
                    >
                      Refuse
                    </button>
                  </div>
                );
              }
              if (statusUpper === 'REFUSED') {
                return (
                  <div className="flex items-center justify-end gap-2">
                    <span className="text-xs text-rose-400 font-semibold px-2.5 py-1 rounded bg-rose-500/15 border border-rose-500/30">
                      Refused
                    </span>
                    <button
                      onClick={() => handleStatusChange(row.id, 'APPROVED')}
                      className="text-xs text-emerald-400 hover:text-emerald-300 hover:underline px-1.5 py-0.5 font-medium transition-colors"
                      title="Change status to Approved"
                    >
                      Approve
                    </button>
                  </div>
                );
              }
              return <span className="text-xs text-ink-400 italic">Completed</span>;
            },
          },
        ]
      : []),
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-ink-900 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-primary-600" />
            <span>Time Off Requests</span>
          </h1>
          <p className="text-xs text-ink-600 mt-1">
            Submit leave requests; allocations are automatically deducted upon approval.
          </p>
        </div>
        <Button variant="primary" icon={Plus} onClick={() => setIsModalOpen(true)}>
          New Request
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={requests}
        emptyMessage="No time off requests found"
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Submit Time Off Request"
        footer={
          <div className="flex items-center justify-end gap-3 w-full">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="timeoff-form"
              variant="primary"
              disabled={saving}
              className="!bg-[#C5A059] !text-slate-950 font-bold hover:!bg-[#b38e36]"
            >
              {saving ? 'Submitting...' : 'Submit Request'}
            </Button>
          </div>
        }
      >
        {errorMessage && (
          <div className="mb-4 p-3.5 rounded-md bg-danger-500/15 border border-danger-500/40 text-xs font-semibold text-danger-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-danger-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form id="timeoff-form" onSubmit={handleCreate} className="flex flex-col gap-4">
          {user?.role !== 'EMPLOYEE' ? (
            <Select
              label="Employee"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
            >
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({emp.code} - {emp.department})
                </option>
              ))}
            </Select>
          ) : (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-ink-600">Employee</label>
              <div className="px-3 py-2 rounded border border-border bg-surface-sunken text-sm text-ink-900 font-medium">
                {user.name || 'Current Employee'} {user.employeeCode ? `(${user.employeeCode})` : ''}
              </div>
            </div>
          )}

          <Select
            label="Leave Type"
            value={timeOffTypeId}
            onChange={(e) => setTimeOffTypeId(Number(e.target.value))}
          >
            {types.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>

          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Start Date"
              type="date"
              value={startDate}
              onChange={(e) => {
                const val = e.target.value;
                setStartDate(val);
                if (val && endDate) {
                  const d1 = new Date(val);
                  const d2 = new Date(endDate);
                  const diff = Math.max(1, Math.round((d2 - d1) / (1000 * 60 * 60 * 24)) + 1);
                  if (!isNaN(diff) && diff > 0) setNumberOfDays(diff);
                }
              }}
              required
            />
            <Input
              label="End Date"
              type="date"
              value={endDate}
              onChange={(e) => {
                const val = e.target.value;
                setEndDate(val);
                if (startDate && val) {
                  const d1 = new Date(startDate);
                  const d2 = new Date(val);
                  const diff = Math.max(1, Math.round((d2 - d1) / (1000 * 60 * 60 * 24)) + 1);
                  if (!isNaN(diff) && diff > 0) setNumberOfDays(diff);
                }
              }}
              required
            />
            <Input
              label="Number of Days"
              type="number"
              min="1"
              value={numberOfDays}
              onChange={(e) => setNumberOfDays(e.target.value)}
              required
            />
          </div>

          <Input
            label="Reason / Notes"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Family holiday or doctor appointment"
            required
          />
        </form>
      </Modal>
    </div>
  );
}

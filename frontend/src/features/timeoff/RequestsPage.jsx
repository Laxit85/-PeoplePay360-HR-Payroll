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
      const effectiveEmpId = user?.role === 'EMPLOYEE' ? (user.employeeId || 1) : empFilter;
      const [rRes, tRes, eRes] = await Promise.all([
        getTimeOffRequestsApi(effectiveEmpId ? { employee_id: effectiveEmpId } : {}),
        getTimeOffTypesApi(),
        user?.role === 'EMPLOYEE' ? Promise.resolve([]) : getEmployeesApi(),
      ]);

      const rawReqs = rRes?.data || rRes || [];
      const rawTypes = tRes?.data || tRes || [];
      const rawEmps = eRes?.data || eRes || [];

      const formattedReqs = rawReqs.map((r) => ({
        id: r.id,
        employeeId: r.employee_id,
        employeeName: r.first_name ? `${r.first_name} ${r.last_name || ''}`.trim() : 'Employee',
        timeOffTypeId: r.time_off_type_id,
        timeOffTypeName: r.time_off_type_name || 'Leave',
        startDate: r.start_date,
        endDate: r.end_date,
        numberOfDays: r.requested_days || 1,
        status: r.status || 'SUBMITTED',
        reason: r.reason
      }));

      const formattedEmps = rawEmps.map((e) => ({
        id: e.id,
        name: e.first_name ? `${e.first_name} ${e.last_name || ''}`.trim() : 'Employee'
      }));

      setRequests(formattedReqs);
      setTypes(rawTypes);
      setEmployees(formattedEmps);
      if (rawTypes.length) setTimeOffTypeId(rawTypes[0].id);
    } catch (err) {
      console.error('Failed to load leave requests', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [empFilter, user?.employeeId, user?.role]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSaving(true);
    try {
      await createTimeOffRequest({
        employeeId,
        timeOffTypeId,
        startDate,
        endDate,
        numberOfDays: Number(numberOfDays),
        reason,
      });
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      setErrorMessage(err.message || 'Error submitting request');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await updateTimeOffStatus(id, status);
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const canApprove = can('timeoff.approve');

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
            render: (_, row) =>
              row.status === 'To Approve' ? (
                <ApproveRefuseButtons
                  onApprove={() => handleStatusChange(row.id, 'Approved')}
                  onRefuse={() => handleStatusChange(row.id, 'Refused')}
                />
              ) : (
                <span className="text-xs text-ink-400 italic">Completed</span>
              ),
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
          <>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreate} disabled={saving}>
              {saving ? 'Submitting...' : 'Submit Request'}
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

        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          {user?.role !== 'EMPLOYEE' && (
            <Select
              label="Employee"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
            >
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({emp.department || 'General'})
                </option>
              ))}
            </Select>
          )}

          <Select
            label="Time Off Type"
            value={timeOffTypeId}
            onChange={(e) => setTimeOffTypeId(e.target.value)}
          >
            {types.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.requiresAllocation ? 'Requires Allocation Balance' : 'No Allocation Needed'})
              </option>
            ))}
          </Select>

          <div className="grid grid-cols-3 gap-3">
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
            <Input
              label="Number of Days"
              type="number"
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

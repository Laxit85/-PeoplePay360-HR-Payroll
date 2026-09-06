import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Clock, ArrowLeft, Edit3, AlertCircle, Filter, User } from 'lucide-react';
import { getAttendanceLogsApi, getEmployeeByIdApi, getEmployeesApi, correctAttendanceApi } from '../../api';
import { DataTable } from '../../components/data/DataTable';
import { StatusBadge } from '../../components/data/StatusBadge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { formatDate, formatDateTime, formatHours } from '../../lib/format';
import { useAuth } from '../../auth/useAuth';

export function AttendanceListPage() {
  const { id } = useParams(); // optional employee filter from URL
  const navigate = useNavigate();
  const { can, user } = useAuth();

  const [attendance, setAttendance] = useState([]);
  const [employee, setEmployee] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [selectedEmpId, setSelectedEmpId] = useState(id || '');
  const [loading, setLoading] = useState(true);
  const [isCorrectionOpen, setIsCorrectionOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);

  // Correction Form
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [status, setStatus] = useState('ON_TIME');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  // Fetch employees for dropdown filter
  useEffect(() => {
    getEmployeesApi().then((res) => {
      const list = res?.data || res || [];
      setEmployees(Array.isArray(list) ? list : []);
    }).catch(() => {});
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const activeId = selectedEmpId || id;
      const [listRes, empRes] = await Promise.all([
        getAttendanceLogsApi({ employee_id: activeId || undefined }),
        activeId ? getEmployeeByIdApi(activeId) : Promise.resolve(null),
      ]);

      const rawList = listRes?.data || listRes || [];
      const formattedList = rawList.map((row) => ({
        id: row.id,
        employeeId: row.employee_id,
        employeeCode: row.employee_code,
        employeeName: row.first_name ? `${row.first_name} ${row.last_name || ''}`.trim() : 'Employee',
        department: row.department_name,
        checkIn: row.check_in,
        checkOut: row.check_out,
        workedHours: row.worked_hours || 0,
        status: row.status || 'ON_TIME',
        date: row.attendance_date,
      }));

      setAttendance(formattedList);
      if (empRes?.data) setEmployee(empRes.data);
      else if (!activeId) setEmployee(null);
    } catch (err) {
      console.error('Failed to load attendance', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedEmpId, id]);

  const toLocalIso = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const handleOpenCorrection = (record) => {
    setSelectedRecord(record);
    setCheckIn(toLocalIso(record.checkIn));
    setCheckOut(toLocalIso(record.checkOut));
    setStatus(record.status || 'ON_TIME');
    setReason('');
    setIsCorrectionOpen(true);
  };

  const handleSaveCorrection = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      let workedHours = selectedRecord.workedHours;
      if (checkIn && checkOut) {
        const diffMs = new Date(checkOut).getTime() - new Date(checkIn).getTime();
        workedHours = Number((diffMs / (1000 * 60 * 60)).toFixed(2));
      }
      await correctAttendanceApi(selectedRecord.id, {
        check_in: checkIn || null,
        check_out: checkOut || null,
        worked_hours: workedHours,
        status,
        correction_reason: reason || 'Manual administrative correction'
      });
      setIsCorrectionOpen(false);
      await fetchData();
    } catch (err) {
      alert(err?.response?.data?.message || err.message || 'Failed to apply correction');
    } finally {
      setSaving(false);
    }
  };

  const canCorrect = can('attendance.correct');

  const columns = [
    {
      key: 'employeeName',
      header: 'Employee Name',
      render: (val, row) => (
        <div>
          <span className="font-bold text-ink-900">{val}</span>
          {row.employeeCode && (
            <p className="text-[11px] text-ink-500 font-mono">{row.employeeCode}</p>
          )}
        </div>
      )
    },
    { key: 'date', header: 'Date', render: (val) => formatDate(val) },
    { key: 'checkIn', header: 'Check In', render: (val) => formatDateTime(val) },
    { key: 'checkOut', header: 'Check Out', render: (val) => formatDateTime(val) },
    {
      key: 'workedHours',
      header: 'Worked Hours',
      align: 'right',
      render: (val) => <span className="font-semibold">{formatHours(val)}</span>,
    },
    { key: 'status', header: 'Status', render: (val) => <StatusBadge status={val} /> },
    ...(canCorrect
      ? [
          {
            key: 'actions',
            header: 'Correction',
            align: 'right',
            render: (_, row) => (
              <Button
                variant="ghost"
                icon={Edit3}
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenCorrection(row);
                }}
              >
                Correct
              </Button>
            ),
          },
        ]
      : []),
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {id && (
            <Button variant="secondary" icon={ArrowLeft} onClick={() => navigate(`/employees/${id}`)}>
              Back to Employee
            </Button>
          )}
          <div>
            <h1 className="text-2xl font-bold font-display text-ink-900 flex items-center gap-2">
              <Clock className="w-6 h-6 text-primary-600" />
              <span>Attendance Logs {employee ? `— ${employee.first_name} ${employee.last_name || ''}` : ''}</span>
            </h1>
            <p className="text-xs text-ink-600 mt-1">
              System-generated check-in/out records. Corrections are restricted to HR Managers & Admins.
            </p>
          </div>
        </div>
      </div>

      {/* Employee Filter Bar */}
      <div className="p-3.5 bg-surface border border-border rounded-md flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <User className="w-4 h-4 text-primary-600 shrink-0" />
          <span className="text-xs font-semibold text-ink-600">Filter by Employee:</span>
          <select
            value={selectedEmpId}
            onChange={(e) => setSelectedEmpId(e.target.value)}
            className="bg-surface-muted text-xs text-ink-900 font-medium border border-border-strong rounded-sm px-3 py-1.5 focus:outline-none focus:border-primary-600 cursor-pointer min-w-[220px]"
          >
            <option value="">All Employees ({employees.length})</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.first_name} {emp.last_name} ({emp.employee_code}) - {emp.department_name || 'General'}
              </option>
            ))}
          </select>
        </div>

        {selectedEmpId && (
          <button
            onClick={() => setSelectedEmpId('')}
            className="text-xs text-primary-600 hover:underline font-semibold"
          >
            Clear Filter (Show All Logs)
          </button>
        )}
      </div>

      <DataTable
        columns={columns}
        data={attendance}
        emptyMessage="No attendance logs found"
      />

      {/* Role-gated Correction Modal */}
      <Modal
        isOpen={isCorrectionOpen}
        onClose={() => setIsCorrectionOpen(false)}
        title={`Correct Attendance — ${selectedRecord?.employeeName}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsCorrectionOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveCorrection} disabled={saving}>
              {saving ? 'Saving...' : 'Apply Correction'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSaveCorrection} className="flex flex-col gap-4">
          <Input
            label="Check In Timestamp"
            type="datetime-local"
            value={checkIn}
            onChange={(e) => setCheckIn(e.target.value)}
          />
          <Input
            label="Check Out Timestamp"
            type="datetime-local"
            value={checkOut}
            onChange={(e) => setCheckOut(e.target.value)}
          />
          <Select label="Status Override" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="ON_TIME">On Time (Present)</option>
            <option value="LATE">Late Arrival</option>
            <option value="EARLY_EXIT">Early Exit</option>
            <option value="OVERTIME">Overtime</option>
            <option value="MISSING_CHECKOUT">Missing Checkout</option>
          </Select>
          <Input
            label="Correction Reason"
            placeholder="e.g. Badge reader clock discrepancy"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </form>
      </Modal>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Clock, ArrowLeft, Edit3, AlertCircle } from 'lucide-react';
import { getMockAttendance, correctMockAttendance, getMockEmployeeById } from '../../mockApi/apiHandlers';
import { DataTable } from '../../components/data/DataTable';
import { StatusBadge } from '../../components/data/StatusBadge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { formatDateTime, formatHours } from '../../lib/format';
import { useAuth } from '../../auth/useAuth';

export function AttendanceListPage() {
  const { id } = useParams(); // optional employee filter
  const navigate = useNavigate();
  const { can, user } = useAuth();

  const [attendance, setAttendance] = useState([]);
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isCorrectionOpen, setIsCorrectionOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);

  // Correction Form
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [status, setStatus] = useState('Present');
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [list, emp] = await Promise.all([
        getMockAttendance(id),
        id ? getMockEmployeeById(id) : null,
      ]);
      setAttendance(list);
      setEmployee(emp);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleOpenCorrection = (record) => {
    setSelectedRecord(record);
    setCheckIn(record.checkIn ? record.checkIn.slice(0, 16) : '');
    setCheckOut(record.checkOut ? record.checkOut.slice(0, 16) : '');
    setStatus(record.status);
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
      await correctMockAttendance({
        id: selectedRecord.id,
        checkIn: checkIn ? new Date(checkIn).toISOString() : null,
        checkOut: checkOut ? new Date(checkOut).toISOString() : null,
        workedHours,
        status,
      });
      setIsCorrectionOpen(false);
      fetchData();
    } finally {
      setSaving(false);
    }
  };

  const canCorrect = can('attendance.correct');

  const columns = [
    { key: 'employeeName', header: 'Employee Name' },
    { key: 'date', header: 'Date' },
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
              <span>Attendance Logs {employee ? `— ${employee.name}` : ''}</span>
            </h1>
            <p className="text-xs text-ink-600 mt-1">
              System-generated check-in/out records. Corrections are restricted to HR Managers & Admins.
            </p>
          </div>
        </div>
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
            <option value="Present">Present</option>
            <option value="Late">Late</option>
            <option value="Overtime">Overtime</option>
            <option value="Absent">Absent</option>
            <option value="Missing checkout">Missing checkout</option>
          </Select>
        </form>
      </Modal>
    </div>
  );
}

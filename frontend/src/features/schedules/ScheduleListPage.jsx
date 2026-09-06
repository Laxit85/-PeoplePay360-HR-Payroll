import React, { useState, useEffect } from 'react';
import { Plus, Clock, Trash2, Edit } from 'lucide-react';
import { getMockSchedules, saveMockSchedule, deleteMockSchedule } from '../../mockApi/apiHandlers';
import { DataTable } from '../../components/data/DataTable';
import { StatusBadge } from '../../components/data/StatusBadge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { useAuth } from '../../auth/useAuth';

export function ScheduleListPage() {
  const { user, can } = useAuth();
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [name, setName] = useState('');
  const [calendarType, setCalendarType] = useState('Standard 40h');
  const [daysPerWeek, setDaysPerWeek] = useState(5);
  const [hoursPerWeek, setHoursPerWeek] = useState(40);
  const [company, setCompany] = useState('OXP Global Inc.');
  const [status, setStatus] = useState('Active');
  const [saving, setSaving] = useState(false);

  const canManage =
    can('schedules.manage') ||
    can('schedules.delete') ||
    can('contracts.manage') ||
    user?.role === 'ADMIN' ||
    user?.role === 'HR_MANAGER' ||
    user?.role === 'HR_PAYROLL_MANAGER' ||
    user?.role === 'HR_PAYROLL_USER';

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      const list = await getMockSchedules();
      setSchedules(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  const handleOpenNew = () => {
    setSelectedSchedule(null);
    setName('');
    setCalendarType('Standard 40h');
    setDaysPerWeek(5);
    setHoursPerWeek(40);
    setCompany('OXP Global Inc.');
    setStatus('Active');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (s) => {
    setSelectedSchedule(s);
    setName(s.name || '');
    setCalendarType(s.calendarType || 'Standard 40h');
    setDaysPerWeek(s.daysPerWeek || 5);
    setHoursPerWeek(s.hoursPerWeek || 40);
    setCompany(s.company || 'OXP Global Inc.');
    setStatus(s.status || 'Active');
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await saveMockSchedule({
        id: selectedSchedule?.id,
        name,
        calendarType,
        daysPerWeek: Number(daysPerWeek),
        hoursPerWeek: Number(hoursPerWeek),
        company,
        status,
      });
      setIsModalOpen(false);
      await fetchSchedules();
    } catch (err) {
      console.error('Failed to save schedule', err);
      alert(err?.message || 'Failed to save schedule');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, scheduleName) => {
    if (!window.confirm(`Are you sure you want to delete working schedule "${scheduleName || 'Selected Schedule'}"?`)) {
      return;
    }
    setSaving(true);
    try {
      await deleteMockSchedule(id);
      setIsModalOpen(false);
      await fetchSchedules();
    } catch (err) {
      console.error('Failed to delete schedule', err);
      alert(err?.message || 'Failed to delete schedule');
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { key: 'name', header: 'Schedule Name' },
    { key: 'calendarType', header: 'Calendar Type' },
    { key: 'daysPerWeek', header: 'Days / Week', align: 'center' },
    {
      key: 'hoursPerWeek',
      header: 'Hours / Week',
      align: 'right',
      render: (val) => <span className="font-semibold">{val} hrs</span>,
    },
    { key: 'company', header: 'Company' },
    { key: 'status', header: 'Status', render: (val) => <StatusBadge status={val} /> },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (_, row) => (
        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
          {canManage && (
            <>
              <Button
                variant="secondary"
                size="sm"
                icon={Edit}
                onClick={() => handleOpenEdit(row)}
                title="Edit Schedule"
              >
                Edit
              </Button>
              <Button
                variant="ghost"
                size="sm"
                icon={Trash2}
                className="!text-rose-600 hover:!text-rose-700 hover:!bg-rose-50 border border-rose-200/60"
                onClick={() => handleDelete(row.id, row.name)}
                title="Delete Working Schedule"
              >
                Delete
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-ink-900 flex items-center gap-2">
            <Clock className="w-6 h-6 text-primary-600" />
            <span>Working Schedules</span>
          </h1>
          <p className="text-xs text-ink-600 mt-1">
            Weekly working patterns referenced by Contracts, Attendance, and Payroll expected hours
          </p>
        </div>
        {canManage && (
          <Button variant="primary" icon={Plus} onClick={handleOpenNew}>
            New Schedule
          </Button>
        )}
      </div>

      <DataTable
        columns={columns}
        data={schedules}
        onRowClick={(s) => canManage && handleOpenEdit(s)}
        emptyMessage="No working schedules defined"
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedSchedule ? 'Edit Working Schedule' : 'Create Working Schedule'}
        footer={
          <div className="flex items-center justify-between w-full">
            <div>
              {selectedSchedule && canManage && (
                <Button
                  variant="ghost"
                  icon={Trash2}
                  className="!text-rose-600 hover:!text-rose-700 hover:!bg-rose-50 border border-rose-200"
                  onClick={() => handleDelete(selectedSchedule.id, selectedSchedule.name)}
                  disabled={saving}
                >
                  Delete Schedule
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save Schedule'}
              </Button>
            </div>
          </div>
        }
      >
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <Input
            label="Schedule Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Standard Full-Time (40h/week)"
            required
          />
          <Input
            label="Calendar Type"
            value={calendarType}
            onChange={(e) => setCalendarType(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Working Days / Week"
              type="number"
              value={daysPerWeek}
              onChange={(e) => setDaysPerWeek(e.target.value)}
              required
            />
            <Input
              label="Total Hours / Week"
              type="number"
              value={hoursPerWeek}
              onChange={(e) => setHoursPerWeek(e.target.value)}
              required
            />
          </div>
          <Input
            label="Company"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
          />
          <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </Select>
        </form>
      </Modal>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Plus, Calendar, Clock } from 'lucide-react';
import { getMockSchedules, saveMockSchedule } from '../../mockApi/apiHandlers';
import { DataTable } from '../../components/data/DataTable';
import { StatusBadge } from '../../components/data/StatusBadge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { useAuth } from '../../auth/useAuth';

export function ScheduleListPage() {
  const { can } = useAuth();
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
    setStatus('Active');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (s) => {
    setSelectedSchedule(s);
    setName(s.name);
    setCalendarType(s.calendarType);
    setDaysPerWeek(s.daysPerWeek);
    setHoursPerWeek(s.hoursPerWeek);
    setCompany(s.company);
    setStatus(s.status);
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
      fetchSchedules();
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
        {can('contracts.manage') && (
          <Button variant="primary" icon={Plus} onClick={handleOpenNew}>
            New Schedule
          </Button>
        )}
      </div>

      <DataTable
        columns={columns}
        data={schedules}
        onRowClick={(s) => can('contracts.manage') && handleOpenEdit(s)}
        emptyMessage="No working schedules defined"
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedSchedule ? 'Edit Working Schedule' : 'Create Working Schedule'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Schedule'}
            </Button>
          </>
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

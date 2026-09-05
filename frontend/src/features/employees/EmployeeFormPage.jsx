import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FileText,
  Clock,
  Calendar,
  Award,
  Save,
  ArrowLeft,
} from 'lucide-react';
import { getEmployeeByIdApi, updateEmployeeApi } from '../../api';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { useAuth } from '../../auth/useAuth';

export function EmployeeFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { can } = useAuth();

  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('work'); // work | private | hr

  const [formData, setFormData] = useState({});

  const fetchEmployee = async () => {
    setLoading(true);
    try {
      const res = await getEmployeeByIdApi(id);
      const data = res.data || res;
      const formatted = {
        ...data,
        name: data.first_name ? `${data.first_name} ${data.last_name || ''}`.trim() : (data.name || 'Employee'),
        jobTitle: data.job_position_title || data.job_title || 'Team Member',
        department: data.department_name || data.department || 'Engineering',
        workEmail: data.email || data.work_email || '',
        workPhone: data.phone || data.work_phone || '',
        employeeType: data.employee_type ? (data.employee_type.charAt(0) + data.employee_type.slice(1).toLowerCase().replace('_', '-')) : 'Full-time',
        status: data.employment_status || 'ACTIVE',
        bankName: data.bank_name || '',
        accountNumber: data.bank_account_no || '',
        ifscCode: data.bank_ifsc_or_routing || '',
        taxId: data.tax_id_or_pan || '',
        manager: data.manager_name || '',
        avatarUrl: data.avatar_url || `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80`,
      };
      setEmployee(formatted);
      setFormData(formatted);
    } catch {
      navigate('/employees');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployee();
  }, [id]);

  const handleChange = (field, val, section = null) => {
    if (section) {
      setFormData((prev) => ({
        ...prev,
        [section]: {
          ...(prev[section] || {}),
          [field]: val,
        },
      }));
    } else {
      setFormData((prev) => ({ ...prev, [field]: val }));
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const nameParts = (formData.name || '').trim().split(' ');
      const firstName = nameParts[0] || formData.first_name || '';
      const lastName = nameParts.slice(1).join(' ') || formData.last_name || '';

      await updateEmployeeApi(id, {
        first_name: firstName,
        last_name: lastName,
        email: formData.workEmail || formData.email,
        phone: formData.workPhone || formData.phone,
        job_title: formData.jobTitle || formData.job_title,
        department: formData.department,
        employee_type: formData.employeeType,
        employment_status: formData.status,
        bank_name: formData.bankName,
        bank_account_no: formData.accountNumber,
        bank_ifsc_or_routing: formData.ifscCode,
        tax_id_or_pan: formData.taxId,
      });
      await fetchEmployee();
    } catch (err) {
      console.error('Failed to update employee', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !employee) {
    return (
      <div className="p-12 text-center text-ink-600 font-medium">
        Loading employee profile hub...
      </div>
    );
  }

  const counts = employee.counts || {};

  return (
    <div className="flex flex-col gap-6">
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            icon={ArrowLeft}
            onClick={() => navigate(user?.role === 'EMPLOYEE' ? '/attendance' : '/employees')}
          >
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold font-display text-ink-900">{employee.name}</h1>
            <p className="text-xs text-ink-600">{employee.jobTitle} — Central Hub</p>
          </div>
        </div>

        {(can('employees.update') || user?.role === 'EMPLOYEE') && (
          <Button variant="primary" icon={Save} onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        )}
      </div>

      {/* Smart Buttons Pill Bar */}
      <div className="flex flex-wrap items-center gap-3 p-3 bg-surface border border-border rounded-[var(--radius-md)] shadow-xs">
        <button
          onClick={() => navigate(`/employees/${id}/contracts`)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-50 hover:bg-primary-600 hover:text-surface-sunken text-primary-600 rounded-pill font-bold text-xs transition-all border border-primary-600/30"
        >
          <FileText className="w-4 h-4" />
          <span>Contracts</span>
          <span className="px-2 py-0.5 rounded-pill bg-primary-600 text-surface-sunken font-extrabold text-[11px]">
            {counts.contracts || 0}
          </span>
        </button>

        <button
          onClick={() => navigate(`/employees/${id}/attendance`)}
          className="flex items-center gap-2 px-4 py-2 bg-surface-muted hover:bg-surface-sunken hover:text-primary-600 text-ink-900 rounded-pill font-bold text-xs transition-all border border-border"
        >
          <Clock className="w-4 h-4" />
          <span>Attendance Logs</span>
          <span className="px-2 py-0.5 rounded-pill bg-ink-600 text-surface-sunken font-extrabold text-[11px]">
            {counts.attendance || 0}
          </span>
        </button>

        <button
          onClick={() => navigate(`/timeoff/requests?employeeId=${id}`)}
          className="flex items-center gap-2 px-4 py-2 bg-amber-50 hover:bg-amber-600 hover:text-white text-amber-600 rounded-pill font-bold text-xs transition-all border border-amber-600/30"
        >
          <Calendar className="w-4 h-4" />
          <span>Time Off Requests</span>
          <span className="px-2 py-0.5 rounded-pill bg-amber-600 text-white font-extrabold text-[11px]">
            {counts.timeoff || 0}
          </span>
        </button>

        <button
          onClick={() => navigate(`/timeoff/allocations?employeeId=${id}`)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-50 hover:bg-primary-600 hover:text-surface-sunken text-primary-600 rounded-pill font-bold text-xs transition-all border border-primary-600/30"
        >
          <Award className="w-4 h-4" />
          <span>Allocations</span>
          <span className="px-2 py-0.5 rounded-pill bg-primary-600 text-surface-sunken font-extrabold text-[11px]">
            {counts.allocations || 0}
          </span>
        </button>
      </div>

      {/* Profile Overview Card */}
      <div className="p-6 bg-surface border border-border rounded-[var(--radius-md)] flex flex-col md:flex-row items-start gap-6">
        <img
          src={formData.avatarUrl}
          alt={formData.name}
          className="w-24 h-24 rounded-full object-cover border-2 border-primary-600 shrink-0 shadow-gold"
        />
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
          <Input
            label="Employee Full Name"
            value={formData.name || ''}
            onChange={(e) => handleChange('name', e.target.value)}
          />
          <Input
            label="Job Position Title"
            value={formData.jobTitle || ''}
            onChange={(e) => handleChange('jobTitle', e.target.value)}
          />
          <Select
            label="Department"
            value={formData.department || 'Engineering'}
            onChange={(e) => handleChange('department', e.target.value)}
          >
            <option value="Executive">Executive</option>
            <option value="Engineering">Engineering</option>
            <option value="Human Resources">Human Resources</option>
            <option value="Finance & Payroll">Finance & Payroll</option>
            <option value="Operations">Operations</option>
            <option value="Product">Product</option>
          </Select>
          <Select
            label="Employment Type"
            value={formData.employeeType || 'Full-time'}
            onChange={(e) => handleChange('employeeType', e.target.value)}
          >
            <option value="Full-time">Full-time</option>
            <option value="Part-time">Part-time</option>
            <option value="Contractor">Contractor</option>
            <option value="Intern">Intern</option>
          </Select>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="bg-surface border border-border rounded-[var(--radius-md)] overflow-hidden">
        <div className="flex border-b border-border bg-surface-sunken px-4 pt-2 gap-2">
          <button
            onClick={() => setActiveTab('work')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-sm transition-colors border-b-2 ${
              activeTab === 'work'
                ? 'bg-surface text-primary-600 border-primary-600'
                : 'text-ink-600 border-transparent hover:text-ink-900'
            }`}
          >
            Work Information
          </button>
          <button
            onClick={() => setActiveTab('private')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-sm transition-colors border-b-2 ${
              activeTab === 'private'
                ? 'bg-surface text-primary-600 border-primary-600'
                : 'text-ink-600 border-transparent hover:text-ink-900'
            }`}
          >
            Private Information
          </button>
          <button
            onClick={() => setActiveTab('hr')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-sm transition-colors border-b-2 ${
              activeTab === 'hr'
                ? 'bg-surface text-primary-600 border-primary-600'
                : 'text-ink-600 border-transparent hover:text-ink-900'
            }`}
          >
            HR Settings & Payroll
          </button>
        </div>

        {/* Tab Content Panels */}
        <div className="p-6">
          {activeTab === 'work' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-ink-600">
                  Location & Contact
                </h3>
                <Input
                  label="Work Email Address"
                  type="email"
                  value={formData.workEmail || ''}
                  onChange={(e) => handleChange('workEmail', e.target.value)}
                />
                <Input
                  label="Work Phone Number"
                  value={formData.workPhone || ''}
                  onChange={(e) => handleChange('workPhone', e.target.value)}
                />
                <Input
                  label="Company Name"
                  value={formData.company || 'OXP Global Inc.'}
                  onChange={(e) => handleChange('company', e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-ink-600">
                  Manager & Hierarchy
                </h3>
                <Input
                  label="Direct Manager"
                  value={formData.manager || ''}
                  onChange={(e) => handleChange('manager', e.target.value)}
                />
              </div>
            </div>
          )}

          {activeTab === 'private' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-ink-600">
                  Personal Details
                </h3>
                <Input
                  label="Personal Email Address"
                  type="email"
                  value={formData.privateInfo?.personalEmail || ''}
                  onChange={(e) => handleChange('personalEmail', e.target.value, 'privateInfo')}
                />
                <Input
                  label="Personal Phone"
                  value={formData.privateInfo?.phone || ''}
                  onChange={(e) => handleChange('phone', e.target.value, 'privateInfo')}
                />
                <Input
                  label="Home Address"
                  value={formData.privateInfo?.address || ''}
                  onChange={(e) => handleChange('address', e.target.value, 'privateInfo')}
                />
              </div>

              <div className="flex flex-col gap-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-ink-600">
                  Citizenship & Status
                </h3>
                <Input
                  label="Nationality"
                  value={formData.privateInfo?.nationality || ''}
                  onChange={(e) => handleChange('nationality', e.target.value, 'privateInfo')}
                />
                <Input
                  label="Date of Birth"
                  type="date"
                  value={formData.privateInfo?.dob || ''}
                  onChange={(e) => handleChange('dob', e.target.value, 'privateInfo')}
                />
                <Select
                  label="Gender"
                  value={formData.privateInfo?.gender || 'Male'}
                  onChange={(e) => handleChange('gender', e.target.value, 'privateInfo')}
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </Select>
              </div>
            </div>
          )}

          {activeTab === 'hr' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-ink-600">
                  Badge & Access Credentials
                </h3>
                <Input
                  label="Employee Badge ID"
                  value={formData.hrSettings?.badgeId || ''}
                  onChange={(e) => handleChange('badgeId', e.target.value, 'hrSettings')}
                />
                <Input
                  label="Security PIN Code"
                  type="password"
                  value={formData.hrSettings?.pin || ''}
                  onChange={(e) => handleChange('pin', e.target.value, 'hrSettings')}
                />
              </div>

              <div className="flex flex-col gap-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-ink-600">
                  Payroll Direct Deposit Bank Account
                </h3>
                <Input
                  label="Bank Name"
                  value={formData.bankName || ''}
                  onChange={(e) => handleChange('bankName', e.target.value)}
                  placeholder="JPMorgan Chase"
                />
                <Input
                  label="Account Number"
                  value={formData.accountNumber || ''}
                  onChange={(e) => handleChange('accountNumber', e.target.value)}
                  placeholder="•••• 8829"
                />
                <Input
                  label="SWIFT / IFSC / Routing Code"
                  value={formData.ifscCode || ''}
                  onChange={(e) => handleChange('ifscCode', e.target.value)}
                  placeholder="CHASUS33"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

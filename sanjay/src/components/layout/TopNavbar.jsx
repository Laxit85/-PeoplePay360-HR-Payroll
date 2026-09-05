import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { ChevronDown, Shield, LogOut, User as UserIcon } from 'lucide-react';
import { useAuth } from '../../auth/useAuth';
import { CheckInOutWidget } from '../../features/attendance/CheckInOutWidget';
import { DepartmentModal } from '../../features/departments/DepartmentModal';

export function TopNavbar() {
  const { user, logout, switchUser, availableUsers, canAccess, can } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [timeOffOpen, setTimeOffOpen] = useState(false);
  const [payrollOpen, setPayrollOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Single Department Management Popup Modal State
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [deptModalInitialTab, setDeptModalInitialTab] = useState('list');

  const timeOffRef = useRef(null);
  const payrollRef = useRef(null);
  const userRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (timeOffRef.current && !timeOffRef.current.contains(e.target)) setTimeOffOpen(false);
      if (payrollRef.current && !payrollRef.current.contains(e.target)) setPayrollOpen(false);
      if (userRef.current && !userRef.current.contains(e.target)) setUserMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const path = location.pathname;

  // Strict Mutually Exclusive Section Active Checking Logic
  const isContractsActive = path.includes('/contracts');
  const isAttendanceActive = path.includes('/attendance');
  const isSchedulesActive = path.startsWith('/schedules');
  const isEmployeesActive =
    path.startsWith('/employees') && !isContractsActive && !isAttendanceActive;

  const isTimeOffActive = path.startsWith('/timeoff');
  const isPayrollActive = path.startsWith('/payroll');
  const isUserMgmtActive = path.startsWith('/admin');
  const isDepartmentsActive = isDeptModalOpen;

  // Underline-only active indicator style (No rounded box border around words)
  const navLinkStyle = (isActive) =>
    `py-1.5 px-2 font-bold text-sm transition-all select-none border-b-2 cursor-pointer ${
      isActive
        ? 'text-primary-600 border-primary-600'
        : 'text-ink-600 hover:text-ink-900 border-transparent hover:border-ink-600/40'
    }`;

  const openDepartmentModal = (tab = 'list') => {
    setDeptModalInitialTab(tab);
    setIsDeptModalOpen(true);
  };

  return (
    <>
      <header className="w-full bg-surface border-b border-border sticky top-0 z-40 shadow-md">
        {/* Role Quick Switcher Banner */}
        <div className="bg-[#07090F] border-b border-border/60 text-ink-900 px-4 py-1 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Shield className="w-3.5 h-3.5 text-primary-600" />
            <span className="font-semibold text-ink-600">Active Role:</span>
            <span className="font-bold text-ink-900 px-2.5 py-0.5 bg-primary-600/20 text-primary-600 border border-primary-600/30 rounded-pill">
              {user?.role || 'Guest'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-ink-400 hidden sm:inline">Switch Role Context:</span>
            <select
              value={user?.id || ''}
              onChange={(e) => {
                const u = availableUsers.find((x) => x.id === e.target.value);
                if (u) switchUser(u);
              }}
              className="bg-surface-muted text-xs text-ink-900 border border-border-strong rounded-sm px-2 py-0.5 focus:outline-none cursor-pointer"
            >
              {availableUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Main Top Navigation Bar */}
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <div
              onClick={() => navigate('/')}
              className="font-display font-extrabold text-lg text-primary-600 tracking-tight cursor-pointer flex items-center gap-2 select-none"
            >
              <div className="w-7 h-7 rounded-sm bg-primary-600 text-surface-sunken flex items-center justify-center font-black text-sm shadow-gold">
                HR
              </div>
              <span className="text-ink-900">
                HRMS <span className="text-primary-600">OXP</span>
              </span>
            </div>

            <nav className="hidden md:flex items-center gap-2 text-sm font-medium text-ink-900">
              {canAccess('employees') && (
                <NavLink to="/employees" className={() => navLinkStyle(isEmployeesActive)}>
                  Employees
                </NavLink>
              )}

              {canAccess('contracts') && (
                <NavLink
                  to="/employees/emp-1/contracts"
                  className={() => navLinkStyle(isContractsActive)}
                >
                  Contracts
                </NavLink>
              )}

              {canAccess('attendance') && (
                <NavLink to="/schedules" className={() => navLinkStyle(isSchedulesActive)}>
                  Schedules
                </NavLink>
              )}

              {canAccess('attendance') && (
                <NavLink to="/attendance" className={() => navLinkStyle(isAttendanceActive)}>
                  Attendance
                </NavLink>
              )}

              {/* Time Off Dropdown */}
              {canAccess('timeoff') && (
                <div className="relative" ref={timeOffRef}>
                  <button
                    onClick={() => setTimeOffOpen(!timeOffOpen)}
                    className={`flex items-center gap-1 ${navLinkStyle(isTimeOffActive)}`}
                  >
                    <span>Time Off</span>
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>

                  {timeOffOpen && (
                    <div className="absolute left-0 mt-1 w-52 bg-surface border border-border-strong rounded-[var(--radius-sm)] shadow-modal py-1 z-50 animate-in fade-in duration-100">
                      <NavLink
                        to="/timeoff/requests"
                        onClick={() => setTimeOffOpen(false)}
                        className="block px-4 py-2 text-xs font-medium hover:bg-surface-muted text-ink-900 hover:text-primary-600"
                      >
                        Time Off Requests
                      </NavLink>
                      <NavLink
                        to="/timeoff/allocations"
                        onClick={() => setTimeOffOpen(false)}
                        className="block px-4 py-2 text-xs font-medium hover:bg-surface-muted text-ink-900 hover:text-primary-600"
                      >
                        Allocations Balance
                      </NavLink>
                      <NavLink
                        to="/timeoff/types"
                        onClick={() => setTimeOffOpen(false)}
                        className="block px-4 py-2 text-xs font-medium hover:bg-surface-muted text-ink-900 hover:text-primary-600"
                      >
                        Time Off Types Policy
                      </NavLink>
                    </div>
                  )}
                </div>
              )}

              {/* Payroll Dropdown */}
              {canAccess('payroll') && (
                <div className="relative" ref={payrollRef}>
                  <button
                    onClick={() => setPayrollOpen(!payrollOpen)}
                    className={`flex items-center gap-1 ${navLinkStyle(isPayrollActive)}`}
                  >
                    <span>Payroll</span>
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>

                  {payrollOpen && (
                    <div className="absolute left-0 mt-1 w-52 bg-surface border border-border-strong rounded-[var(--radius-sm)] shadow-modal py-1 z-50 animate-in fade-in duration-100">
                      <NavLink
                        to="/payroll/dashboard"
                        onClick={() => setPayrollOpen(false)}
                        className="block px-4 py-2 text-xs font-medium hover:bg-surface-muted text-ink-900 hover:text-primary-600"
                      >
                        Payroll Dashboard
                      </NavLink>
                      <NavLink
                        to="/payroll/payruns"
                        onClick={() => setPayrollOpen(false)}
                        className="block px-4 py-2 text-xs font-medium hover:bg-surface-muted text-ink-900 hover:text-primary-600"
                      >
                        Pay Runs
                      </NavLink>
                      {can('payroll.structures.read') && (
                        <NavLink
                          to="/payroll/structures"
                          onClick={() => setPayrollOpen(false)}
                          className="block px-4 py-2 text-xs font-medium hover:bg-surface-muted text-ink-900 hover:text-primary-600"
                        >
                          Salary Structures
                        </NavLink>
                      )}
                      {can('payroll.rules.manage') && (
                        <NavLink
                          to="/payroll/rules"
                          onClick={() => setPayrollOpen(false)}
                          className="block px-4 py-2 text-xs font-medium hover:bg-surface-muted text-ink-900 hover:text-primary-600"
                        >
                          Salary Rules Config
                        </NavLink>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Admin User Management */}
              {canAccess('users') && (
                <NavLink to="/admin/users" className={() => navLinkStyle(isUserMgmtActive)}>
                  User Mgmt
                </NavLink>
              )}

              {/* Departments Direct Modal Trigger (No small dropdown!) */}
              {canAccess('departments') && (
                <button
                  type="button"
                  onClick={() => openDepartmentModal('list')}
                  className={navLinkStyle(isDepartmentsActive)}
                >
                  Departments
                </button>
              )}
            </nav>
          </div>

          {/* Right side check-in widget & profile */}
          <div className="flex items-center gap-3">
            <CheckInOutWidget />

            <div className="relative" ref={userRef}>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 p-1.5 rounded-sm hover:bg-surface-muted transition-colors focus-visible:outline-none border border-transparent hover:border-border"
              >
                <img
                  src={
                    user?.avatarUrl ||
                    'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80'
                  }
                  alt={user?.name}
                  className="w-7 h-7 rounded-full object-cover border border-primary-600/40"
                />
                <span className="text-xs font-semibold text-ink-900 hidden sm:inline">
                  {user?.name?.split(' ')[0]}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-ink-600" />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-1 w-56 bg-surface border border-border-strong rounded-[var(--radius-sm)] shadow-modal py-1 z-50 animate-in fade-in duration-100">
                  <div className="px-4 py-2 border-b border-border">
                    <p className="text-xs font-bold text-ink-900">{user?.name}</p>
                    <p className="text-xs text-ink-400">{user?.email}</p>
                  </div>
                  {user?.employeeId && (
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        navigate(`/employees/${user.employeeId}`);
                      }}
                      className="w-full text-left px-4 py-2 text-xs text-ink-900 hover:bg-surface-muted hover:text-primary-600 flex items-center gap-2"
                    >
                      <UserIcon className="w-3.5 h-3.5" /> My Employee Profile
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      logout();
                      navigate('/login');
                    }}
                    className="w-full text-left px-4 py-2 text-xs text-danger-600 hover:bg-danger-50 flex items-center gap-2"
                  >
                    <LogOut className="w-3.5 h-3.5" /> Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Department Management Popup Modal Window */}
      <DepartmentModal
        isOpen={isDeptModalOpen}
        onClose={() => setIsDeptModalOpen(false)}
        initialTab={deptModalInitialTab}
      />
    </>
  );
}

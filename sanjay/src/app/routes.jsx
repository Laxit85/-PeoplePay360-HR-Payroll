import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { ProtectedRoute } from './ProtectedRoute';

// Feature Pages
import { LoginPage } from '../features/auth/LoginPage';
import { UserListPage } from '../features/admin/UserListPage';
import { EmployeeListPage } from '../features/employees/EmployeeListPage';
import { EmployeeFormPage } from '../features/employees/EmployeeFormPage';
import { ContractListPanel } from '../features/contracts/ContractListPanel';
import { ScheduleListPage } from '../features/schedules/ScheduleListPage';
import { AttendanceListPage } from '../features/attendance/AttendanceListPage';
import { RequestsPage } from '../features/timeoff/RequestsPage';
import { AllocationsPage } from '../features/timeoff/AllocationsPage';
import { TimeOffTypesPage } from '../features/timeoff/TimeOffTypesPage';
import { PayrunListPage } from '../features/payroll/payruns/PayrunListPage';
import { PayrunProcessingPage } from '../features/payroll/payruns/processing/PayrunProcessingPage';
import { PayslipDetailPage } from '../features/payroll/payslips/PayslipDetailPage';
import { StructureListPage } from '../features/payroll/structures/StructureListPage';
import { RuleListPage } from '../features/payroll/rules/RuleListPage';
import { DashboardPage } from '../features/payroll/dashboard/DashboardPage';

export function AppRoutes() {
  return (
    <Routes>
      {/* Public Login Route */}
      <Route path="/login" element={<LoginPage />} />

      {/* Authenticated AppShell Layout */}
      <Route
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Navigate to="/employees" replace />} />

        {/* Module 0: User Management */}
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute module="users">
              <UserListPage />
            </ProtectedRoute>
          }
        />

        {/* Module 1: Employees, Contracts & Schedules */}
        <Route
          path="/employees"
          element={
            <ProtectedRoute module="employees">
              <EmployeeListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/employees/:id"
          element={
            <ProtectedRoute module="employees">
              <EmployeeFormPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/employees/:id/contracts"
          element={
            <ProtectedRoute module="contracts">
              <ContractListPanel />
            </ProtectedRoute>
          }
        />
        <Route
          path="/schedules"
          element={
            <ProtectedRoute module="attendance">
              <ScheduleListPage />
            </ProtectedRoute>
          }
        />

        {/* Module 2: Attendance */}
        <Route
          path="/attendance"
          element={
            <ProtectedRoute module="attendance">
              <AttendanceListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/employees/:id/attendance"
          element={
            <ProtectedRoute module="attendance">
              <AttendanceListPage />
            </ProtectedRoute>
          }
        />

        {/* Module 3: Time Off */}
        <Route
          path="/timeoff/requests"
          element={
            <ProtectedRoute module="timeoff">
              <RequestsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/timeoff/allocations"
          element={
            <ProtectedRoute module="timeoff">
              <AllocationsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/timeoff/types"
          element={
            <ProtectedRoute module="timeoff">
              <TimeOffTypesPage />
            </ProtectedRoute>
          }
        />

        {/* Module 4: Payroll */}
        <Route
          path="/payroll/payruns"
          element={
            <ProtectedRoute module="payroll">
              <PayrunListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/payroll/payruns/:id"
          element={
            <ProtectedRoute module="payroll">
              <PayrunProcessingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/payroll/payslips/:id"
          element={
            <ProtectedRoute module="payroll">
              <PayslipDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/payroll/structures"
          element={
            <ProtectedRoute module="payroll">
              <StructureListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/payroll/rules"
          element={
            <ProtectedRoute module="payroll">
              <RuleListPage />
            </ProtectedRoute>
          }
        />

        {/* Module 5: Dashboard */}
        <Route
          path="/payroll/dashboard"
          element={
            <ProtectedRoute module="payroll">
              <DashboardPage />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/employees" replace />} />
    </Routes>
  );
}

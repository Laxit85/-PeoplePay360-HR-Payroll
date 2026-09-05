import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';

export function ProtectedRoute({ children, module, capability, allowSelf = false }) {
  const { user, isAuthenticated, canAccess, can } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  // If a normal employee tries to access the full employee directory, direct them to their own profile
  if (user?.role === 'EMPLOYEE' && location.pathname === '/employees') {
    return <Navigate to={`/employees/${user?.employeeId || 1}`} replace />;
  }

  // Allow employees to access their own employee profile and related self views
  if (allowSelf && user?.role === 'EMPLOYEE') {
    return children;
  }

  if (module && !canAccess(module)) {
    return (
      <div className="p-12 text-center bg-surface border border-border rounded-[var(--radius-md)] my-8">
        <h2 className="text-xl font-bold font-display text-danger-600 mb-2">Access Denied</h2>
        <p className="text-sm text-ink-600 mb-4">
          Your active role ({user?.role || 'Guest'}) does not have permission to access the <strong>{module}</strong> module.
        </p>
        <span className="text-xs text-ink-400">
          Normal employees have access to Attendance, Time Off Requests, Allocations, and their own Profile.
        </span>
      </div>
    );
  }

  if (capability && !can(capability)) {
    return (
      <div className="p-12 text-center bg-surface border border-border rounded-[var(--radius-md)] my-8">
        <h2 className="text-xl font-bold font-display text-danger-600 mb-2">Access Restricted</h2>
        <p className="text-sm text-ink-600 mb-4">
          Capability <code>{capability}</code> is not permitted for your role.
        </p>
      </div>
    );
  }

  return children;
}

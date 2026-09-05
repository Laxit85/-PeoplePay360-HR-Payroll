import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';

export function ProtectedRoute({ children, module, capability }) {
  const { isAuthenticated, canAccess, can } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  if (module && !canAccess(module)) {
    return (
      <div className="p-12 text-center bg-surface border border-border rounded-[var(--radius-md)] my-8">
        <h2 className="text-xl font-bold font-display text-danger-600 mb-2">Access Denied</h2>
        <p className="text-sm text-ink-600 mb-4">
          Your active role does not have permission to access the <strong>{module}</strong> module.
        </p>
        <span className="text-xs text-ink-400">
          Use the role switcher in the top bar to switch to an authorized role (e.g. Admin or HR Manager).
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

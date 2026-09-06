import React, { createContext, useContext, useState, useEffect } from 'react';
import { loginApi, getMeApi } from '../api';
import { hasPermission, canAccessModule, ROLES } from './permissions';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('hrms_current_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // Fallback
      }
    }
    return {
      id: 1,
      name: 'Aarav Sharma (Admin)',
      email: 'admin@oxp.com',
      role: ROLES.ADMIN,
      employeeId: 1,
      employeeName: 'Aarav Sharma',
    };
  });

  const [token, setToken] = useState(() => localStorage.getItem('hrms_jwt_token') || null);
  const defaultAvailableUsers = [
    { id: 1, name: 'System Admin', email: 'admin@peoplepay360.internal', role: 'ADMIN', employeeId: 203 },
    { id: 2, name: 'Elena Rostova', email: 'hr.manager@peoplepay360.internal', role: 'HR_MANAGER', employeeId: 4 },
    { id: 8, name: 'Vikram Mehta', email: 'payroll.user@peoplepay360.internal', role: 'HR_PAYROLL_USER', employeeId: 9 },
    { id: 3, name: 'David Kim', email: 'payroll.manager@peoplepay360.internal', role: 'HR_PAYROLL_MANAGER', employeeId: 5 },
    { id: 4, name: 'Alex Morgan', email: 'alex.morgan@peoplepay360.internal', role: 'EMPLOYEE', employeeId: 1 }
  ];

  const [availableUsers, setAvailableUsers] = useState(defaultAvailableUsers);

  useEffect(() => {
    if (token) {
      getMeApi()
        .then((res) => {
          const u = res?.user;
          if (u) {
            const formattedUser = {
              id: u.id,
              name: u.employee ? `${u.employee.first_name} ${u.employee.last_name}` : u.email,
              email: u.email,
              role: u.role || ROLES.ADMIN,
              employeeId: u.employee ? u.employee.id : null,
              employeeName: u.employee ? `${u.employee.first_name} ${u.employee.last_name}` : null
            };
            setUser(formattedUser);
            localStorage.setItem('hrms_current_user', JSON.stringify(formattedUser));
          }
        })
        .catch(() => {});
    }
  }, [token]);

  const login = async (email, password) => {
    const res = await loginApi(email, password);
    if (res?.success || (res?.token && res?.user)) {
      const u = res.user;
      const formattedUser = {
        id: u.id,
        name: u.employee ? `${u.employee.first_name} ${u.employee.last_name}` : u.email,
        email: u.email,
        role: u.role || ROLES.ADMIN,
        employeeId: u.employee ? u.employee.id : null,
        employeeName: u.employee ? `${u.employee.first_name} ${u.employee.last_name}` : null
      };
      setUser(formattedUser);
      setToken(res.token);
      localStorage.setItem('hrms_current_user', JSON.stringify(formattedUser));
      localStorage.setItem('hrms_jwt_token', res.token);
      return formattedUser;
    } else {
      throw new Error(res?.message || res?.error || 'Login failed');
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('hrms_current_user');
    localStorage.removeItem('hrms_jwt_token');
  };

  const switchUser = async (selectedUser) => {
    try {
      const res = await loginApi(selectedUser.email, 'password123');
      if (res?.token && res?.user) {
        const u = res.user;
        const formattedUser = {
          id: u.id,
          name: u.employee ? `${u.employee.first_name} ${u.employee.last_name}` : selectedUser.name,
          email: u.email,
          role: u.role,
          employeeId: u.employee ? u.employee.id : selectedUser.employeeId,
          employeeName: u.employee ? `${u.employee.first_name} ${u.employee.last_name}` : selectedUser.name
        };
        setUser(formattedUser);
        setToken(res.token);
        localStorage.setItem('hrms_current_user', JSON.stringify(formattedUser));
        localStorage.setItem('hrms_jwt_token', res.token);
        return;
      }
    } catch {
      // Fallback local switch
    }
    setUser(selectedUser);
    localStorage.setItem('hrms_current_user', JSON.stringify(selectedUser));
  };

  const can = (capability) => {
    if (!user) return false;
    return hasPermission(user.role, capability);
  };

  const canAccess = (moduleName) => {
    if (!user) return false;
    return canAccessModule(user.role, moduleName);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        login,
        logout,
        switchUser,
        availableUsers,
        can,
        canAccess,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

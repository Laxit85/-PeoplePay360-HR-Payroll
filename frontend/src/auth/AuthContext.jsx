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
  const [availableUsers, setAvailableUsers] = useState([]);

  useEffect(() => {
    if (token) {
      getMeApi()
        .then((res) => {
          if (res.success && res.user) {
            const formattedUser = {
              id: res.user.id,
              name: res.user.employee ? `${res.user.employee.first_name} ${res.user.employee.last_name}` : res.user.email,
              email: res.user.email,
              role: res.user.role || ROLES.ADMIN,
              employeeId: res.user.employee ? res.user.employee.id : null,
              employeeName: res.user.employee ? `${res.user.employee.first_name} ${res.user.employee.last_name}` : null
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
    if (res.success) {
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
      throw new Error(res.message || 'Login failed');
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('hrms_current_user');
    localStorage.removeItem('hrms_jwt_token');
  };

  const switchUser = (selectedUser) => {
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

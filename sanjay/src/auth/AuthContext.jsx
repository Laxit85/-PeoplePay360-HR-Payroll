import React, { createContext, useContext, useState, useEffect } from 'react';
import { mockLogin, getMockUsers } from '../mockApi/apiHandlers';
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
      id: 'u-1',
      name: 'Aarav Sharma (Admin)',
      email: 'admin@oxp.com',
      role: ROLES.ADMIN,
      employeeId: 'emp-1',
      employeeName: 'Aarav Sharma',
      avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80',
    };
  });

  const [token, setToken] = useState(() => localStorage.getItem('hrms_jwt_token') || 'mock-jwt-token');
  const [availableUsers, setAvailableUsers] = useState([]);

  useEffect(() => {
    getMockUsers().then(setAvailableUsers).catch(() => {});
  }, []);

  const login = async (email, password) => {
    const res = await mockLogin(email, password);
    setUser(res.user);
    setToken(res.token);
    localStorage.setItem('hrms_current_user', JSON.stringify(res.user));
    localStorage.setItem('hrms_jwt_token', res.token);
    return res.user;
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

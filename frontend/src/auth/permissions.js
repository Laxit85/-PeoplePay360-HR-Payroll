// Flat role capability map according to PeoplePay360 5-Role Schema Specification

export const ROLES = {
  ADMIN: 'ADMIN',
  HR_MANAGER: 'HR_MANAGER',
  HR_PAYROLL_USER: 'HR_PAYROLL_USER',
  HR_PAYROLL_MANAGER: 'HR_PAYROLL_MANAGER',
  EMPLOYEE: 'EMPLOYEE',
};

const PERMISSIONS = {
  [ROLES.ADMIN]: {
    'users.manage': true,
    'roles.manage': true,
    'employees.read': 'all',
    'employees.create': true,
    'employees.update': true,
    'employees.delete': true,
    'departments.read': 'all',
    'departments.manage': true,
    'contracts.read': 'all',
    'contracts.manage': true,
    'contracts.delete': true,
    'schedules.read': 'all',
    'schedules.manage': true,
    'schedules.delete': true,
    'attendance.read': 'all',
    'attendance.checkin': true,
    'attendance.correct': true,
    'timeoff.read': 'all',
    'timeoff.create': true,
    'timeoff.approve': true,
    'timeoff.manage_types': true,
    'timeoff.manage_allocations': true,
    'payroll.payruns.read': 'all',
    'payroll.payruns.manage': true,
    'payroll.payruns.delete': true,
    'payroll.payslips.read': 'all',
    'payroll.structures.read': 'all',
    'payroll.structures.manage': true,
    'payroll.rules.manage': true,
    'payroll.warnings.read': true,
    'dashboard.view': 'all',
  },

  [ROLES.HR_MANAGER]: {
    'users.manage': false,
    'roles.manage': false,
    'employees.read': 'all',
    'employees.create': true,
    'employees.update': true,
    'employees.delete': true,
    'departments.read': 'all',
    'departments.manage': true,
    'contracts.read': 'all',
    'contracts.manage': true,
    'contracts.delete': true,
    'schedules.read': 'all',
    'schedules.manage': true,
    'schedules.delete': true,
    'attendance.read': 'all',
    'attendance.checkin': true,
    'attendance.correct': true,
    'timeoff.read': 'all',
    'timeoff.create': true,
    'timeoff.approve': true,
    'timeoff.manage_types': true,
    'timeoff.manage_allocations': true,
    'payroll.payruns.read': false,
    'payroll.payruns.manage': false,
    'payroll.payruns.delete': false,
    'payroll.payslips.read': false,
    'payroll.structures.read': false,
    'payroll.structures.manage': false,
    'payroll.rules.manage': false,
    'payroll.warnings.read': false,
    'dashboard.view': false,
  },

  [ROLES.HR_PAYROLL_USER]: {
    'users.manage': false,
    'roles.manage': false,
    'employees.read': 'all',
    'employees.create': false,
    'employees.update': false,
    'employees.delete': false,
    'departments.read': 'all',
    'departments.manage': false,
    'contracts.read': 'all',
    'contracts.manage': false,
    'contracts.delete': false,
    'schedules.read': 'all',
    'schedules.manage': true,
    'schedules.delete': true,
    'attendance.read': 'all',
    'attendance.checkin': true,
    'attendance.correct': false,
    'timeoff.read': 'all',
    'timeoff.create': false,
    'timeoff.approve': false,
    'timeoff.manage_types': false,
    'timeoff.manage_allocations': false,
    'payroll.payruns.read': 'all',
    'payroll.payruns.manage': true, // Can work with payruns and compute
    'payroll.payruns.delete': true,
    'payroll.payslips.read': 'all',
    'payroll.structures.read': 'all', // Read-only view
    'payroll.structures.manage': false, // Cannot modify structures
    'payroll.rules.manage': false, // Cannot modify rules
    'payroll.warnings.read': true,
    'dashboard.view': 'payroll',
  },

  [ROLES.HR_PAYROLL_MANAGER]: {
    'users.manage': false,
    'roles.manage': false,
    'employees.read': 'all',
    'employees.create': false,
    'employees.update': false,
    'employees.delete': false,
    'departments.read': 'all',
    'departments.manage': false,
    'contracts.read': 'all',
    'contracts.manage': true,
    'contracts.delete': true,
    'schedules.read': 'all',
    'schedules.manage': true,
    'schedules.delete': true,
    'attendance.read': 'all',
    'attendance.checkin': true,
    'attendance.correct': false,
    'timeoff.read': 'all',
    'timeoff.create': false,
    'timeoff.approve': false,
    'timeoff.manage_types': false,
    'timeoff.manage_allocations': false,
    'payroll.payruns.read': 'all',
    'payroll.payruns.manage': true, // Full payrun control (compute, validate, pay, email)
    'payroll.payruns.delete': true,
    'payroll.payslips.read': 'all',
    'payroll.structures.read': 'all',
    'payroll.structures.manage': true, // Full structure CRUD
    'payroll.rules.manage': false, // Salary Rules Config removed for Payroll Manager (Admin only)
    'payroll.warnings.read': true,
    'dashboard.view': 'payroll',
  },

  [ROLES.EMPLOYEE]: {
    'users.manage': false,
    'roles.manage': false,
    'employees.read': 'own',
    'employees.create': false,
    'employees.update': false,
    'employees.delete': false,
    'departments.read': 'own',
    'departments.manage': false,
    'contracts.read': 'own',
    'contracts.manage': false,
    'schedules.read': 'own',
    'schedules.manage': false,
    'attendance.read': 'own',
    'attendance.checkin': true,
    'attendance.correct': false,
    'timeoff.read': 'own',
    'timeoff.create': true,
    'timeoff.approve': false,
    'timeoff.manage_types': false,
    'timeoff.manage_allocations': false,
    'payroll.payruns.read': false,
    'payroll.payruns.manage': false,
    'payroll.payslips.read': 'own',
    'payroll.structures.read': false,
    'payroll.structures.manage': false,
    'payroll.rules.manage': false,
    'payroll.warnings.read': false,
    'dashboard.view': 'employee',
  },
};

// Aliases for compatibility
PERMISSIONS['HR_PAYROLL_ADMIN'] = PERMISSIONS[ROLES.HR_PAYROLL_MANAGER];
PERMISSIONS['PAYROLL_ADMIN'] = PERMISSIONS[ROLES.HR_PAYROLL_MANAGER];
PERMISSIONS['PAYROLL_USER'] = PERMISSIONS[ROLES.HR_PAYROLL_USER];
PERMISSIONS['TIMEOFF_ADMIN'] = PERMISSIONS[ROLES.HR_MANAGER];
PERMISSIONS['TIMEOFF_USER'] = PERMISSIONS[ROLES.EMPLOYEE];
PERMISSIONS['Admin'] = PERMISSIONS[ROLES.ADMIN];
PERMISSIONS['Hr Manager'] = PERMISSIONS[ROLES.HR_MANAGER];
PERMISSIONS['Employee'] = PERMISSIONS[ROLES.EMPLOYEE];

export function hasPermission(userRole, capability) {
  if (!userRole) return false;
  const roleKey = String(userRole).toUpperCase();
  if (roleKey === 'ADMIN') return true;
  const rolePerms = PERMISSIONS[roleKey] || PERMISSIONS[userRole];
  if (!rolePerms) return false;
  const val = rolePerms[capability];
  if (val === undefined) return false;
  return val;
}

export function canAccessModule(userRole, moduleName) {
  if (!userRole) return false;
  const roleKey = String(userRole).toUpperCase();
  if (roleKey === 'ADMIN' || roleKey === 'ADMINISTRATOR') return true;

  switch (moduleName) {
    case 'employees':
      return hasPermission(userRole, 'employees.read') !== false;
    case 'departments':
      return hasPermission(userRole, 'departments.read') !== false;
    case 'contracts':
      return hasPermission(userRole, 'contracts.read') !== false;
    case 'attendance':
      return hasPermission(userRole, 'attendance.read') !== false;
    case 'timeoff':
      return hasPermission(userRole, 'timeoff.read') !== false;
    case 'payroll':
      if (roleKey === 'HR_MANAGER') return false;
      return (
        hasPermission(userRole, 'payroll.payruns.read') !== false ||
        hasPermission(userRole, 'payroll.payslips.read') !== false ||
        hasPermission(userRole, 'payroll.structures.read') !== false
      );
    case 'users':
      return hasPermission(userRole, 'users.manage') === true;
    default:
      return true;
  }
}

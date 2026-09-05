// Flat role capability map according to §3 of Frontend Reference + Departments Module

export const ROLES = {
  EMPLOYEE: 'EMPLOYEE',
  TIMEOFF_USER: 'TIMEOFF_USER',
  TIMEOFF_ADMIN: 'TIMEOFF_ADMIN',
  PAYROLL_USER: 'PAYROLL_USER',
  PAYROLL_ADMIN: 'PAYROLL_ADMIN',
  HR_MANAGER: 'HR_MANAGER',
  HR_PAYROLL_USER: 'HR_PAYROLL_USER',
  HR_PAYROLL_ADMIN: 'HR_PAYROLL_ADMIN',
  ADMIN: 'ADMIN',
};

const PERMISSIONS = {
  [ROLES.EMPLOYEE]: {
    'employees.read': 'own',
    'employees.create': false,
    'employees.update': false,
    'employees.delete': false,
    'departments.read': 'all',
    'departments.manage': false,
    'contracts.read': 'own',
    'contracts.manage': false,
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
    'users.manage': false,
  },
  [ROLES.TIMEOFF_USER]: {
    'employees.read': 'own',
    'employees.create': false,
    'employees.update': false,
    'employees.delete': false,
    'departments.read': 'all',
    'departments.manage': false,
    'contracts.read': 'own',
    'contracts.manage': false,
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
    'users.manage': false,
  },
  [ROLES.TIMEOFF_ADMIN]: {
    'employees.read': 'all',
    'employees.create': false,
    'employees.update': false,
    'employees.delete': false,
    'departments.read': 'all',
    'departments.manage': false,
    'contracts.read': 'all',
    'contracts.manage': false,
    'attendance.read': 'all',
    'attendance.checkin': true,
    'attendance.correct': false,
    'timeoff.read': 'all',
    'timeoff.create': true,
    'timeoff.approve': true,
    'timeoff.manage_types': true,
    'timeoff.manage_allocations': true,
    'payroll.payruns.read': false,
    'payroll.payruns.manage': false,
    'payroll.payslips.read': false,
    'payroll.structures.read': false,
    'payroll.structures.manage': false,
    'payroll.rules.manage': false,
    'users.manage': false,
  },
  [ROLES.PAYROLL_USER]: {
    'employees.read': 'all',
    'employees.create': false,
    'employees.update': false,
    'employees.delete': false,
    'departments.read': 'all',
    'departments.manage': false,
    'contracts.read': 'all',
    'contracts.manage': false,
    'attendance.read': 'all',
    'attendance.checkin': true,
    'attendance.correct': false,
    'timeoff.read': 'all',
    'timeoff.create': false,
    'timeoff.approve': false,
    'timeoff.manage_types': false,
    'timeoff.manage_allocations': false,
    'payroll.payruns.read': 'all',
    'payroll.payruns.manage': true,
    'payroll.payslips.read': 'all',
    'payroll.structures.read': 'all',
    'payroll.structures.manage': false,
    'payroll.rules.manage': false,
    'users.manage': false,
  },
  [ROLES.PAYROLL_ADMIN]: {
    'employees.read': 'all',
    'employees.create': false,
    'employees.update': false,
    'employees.delete': false,
    'departments.read': 'all',
    'departments.manage': false,
    'contracts.read': 'all',
    'contracts.manage': false,
    'attendance.read': 'all',
    'attendance.checkin': true,
    'attendance.correct': false,
    'timeoff.read': 'all',
    'timeoff.create': false,
    'timeoff.approve': false,
    'timeoff.manage_types': false,
    'timeoff.manage_allocations': false,
    'payroll.payruns.read': 'all',
    'payroll.payruns.manage': true,
    'payroll.payslips.read': 'all',
    'payroll.structures.read': 'all',
    'payroll.structures.manage': true,
    'payroll.rules.manage': true,
    'users.manage': false,
  },
  [ROLES.HR_MANAGER]: {
    'employees.read': 'all',
    'employees.create': true,
    'employees.update': true,
    'employees.delete': true,
    'departments.read': 'all',
    'departments.manage': true,
    'contracts.read': 'all',
    'contracts.manage': true,
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
    'payroll.payslips.read': false,
    'payroll.structures.read': false,
    'payroll.structures.manage': false,
    'payroll.rules.manage': false,
    'users.manage': false,
  },
  [ROLES.HR_PAYROLL_USER]: {
    'employees.read': 'all',
    'employees.create': true,
    'employees.update': true,
    'employees.delete': true,
    'departments.read': 'all',
    'departments.manage': true,
    'contracts.read': 'all',
    'contracts.manage': true,
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
    'payroll.payslips.read': 'all',
    'payroll.structures.read': 'all',
    'payroll.structures.manage': false,
    'payroll.rules.manage': false,
    'users.manage': false,
  },
  [ROLES.HR_PAYROLL_ADMIN]: {
    'employees.read': 'all',
    'employees.create': true,
    'employees.update': true,
    'employees.delete': true,
    'departments.read': 'all',
    'departments.manage': true,
    'contracts.read': 'all',
    'contracts.manage': true,
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
    'payroll.payslips.read': 'all',
    'payroll.structures.read': 'all',
    'payroll.structures.manage': true,
    'payroll.rules.manage': true,
    'users.manage': false,
  },
  [ROLES.ADMIN]: {
    'employees.read': 'all',
    'employees.create': true,
    'employees.update': true,
    'employees.delete': true,
    'departments.read': 'all',
    'departments.manage': true,
    'contracts.read': 'all',
    'contracts.manage': true,
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
    'payroll.payslips.read': 'all',
    'payroll.structures.read': 'all',
    'payroll.structures.manage': true,
    'payroll.rules.manage': true,
    'users.manage': true,
  },
};

// Also support legacy TitleCase aliases
PERMISSIONS['Admin'] = PERMISSIONS[ROLES.ADMIN];
PERMISSIONS['Hr Manager'] = PERMISSIONS[ROLES.HR_MANAGER];
PERMISSIONS['Employee'] = PERMISSIONS[ROLES.EMPLOYEE];

export function hasPermission(userRole, capability) {
  if (!userRole) return false;
  const roleKey = String(userRole).toUpperCase();
  if (roleKey === 'ADMIN') return true;
  const rolePerms = PERMISSIONS[userRole] || PERMISSIONS[roleKey];
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

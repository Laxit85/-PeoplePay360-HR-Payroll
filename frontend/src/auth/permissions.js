// Flat role capability map according to §3 of Frontend Reference + Departments Module

export const ROLES = {
  EMPLOYEE: 'EMPLOYEE',
  HR_MANAGER: 'HR_MANAGER',
  HR_PAYROLL_USER: 'HR_PAYROLL_USER',
  HR_PAYROLL_MANAGER: 'HR_PAYROLL_MANAGER',
  ADMIN: 'ADMIN',
};

export const PRIMARY_ROLES = [
  ROLES.ADMIN,
  ROLES.HR_MANAGER,
  ROLES.HR_PAYROLL_USER,
  ROLES.HR_PAYROLL_MANAGER,
  ROLES.EMPLOYEE,
];

const PERMISSIONS = {
  [ROLES.EMPLOYEE]: {
    'employees.read': 'own',
    'employees.create': false,
    'employees.update': 'own',
    'employees.delete': false,
    'departments.read': false,
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
    'payroll.payruns.validate': false,
    'payroll.payslips.read': 'own',
    'payroll.structures.read': false,
    'payroll.structures.manage': false,
    'payroll.rules.read': false,
    'payroll.rules.manage': false,
    'payroll.dashboard.read': false,
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
    'payroll.payruns.validate': false,
    'payroll.payslips.read': false,
    'payroll.structures.read': false,
    'payroll.structures.manage': false,
    'payroll.rules.read': false,
    'payroll.rules.manage': false,
    'payroll.dashboard.read': false,
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
    'payroll.payruns.validate': false,
    'payroll.payslips.read': 'all',
    'payroll.structures.read': 'all',
    'payroll.structures.manage': false,
    'payroll.rules.read': 'all',
    'payroll.rules.manage': false,
    'payroll.dashboard.read': 'all',
    'users.manage': false,
  },
  [ROLES.HR_PAYROLL_MANAGER]: {
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
    'payroll.payruns.validate': true,
    'payroll.payslips.read': 'all',
    'payroll.structures.read': 'all',
    'payroll.structures.manage': true,
    'payroll.rules.read': 'all',
    'payroll.rules.manage': true,
    'payroll.dashboard.read': 'all',
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
    'payroll.payruns.validate': true,
    'payroll.payslips.read': 'all',
    'payroll.structures.read': 'all',
    'payroll.structures.manage': true,
    'payroll.rules.read': 'all',
    'payroll.rules.manage': true,
    'payroll.dashboard.read': 'all',
    'users.manage': true,
  },
};

// Aliases
PERMISSIONS['Admin'] = PERMISSIONS[ROLES.ADMIN];
PERMISSIONS['Hr Manager'] = PERMISSIONS[ROLES.HR_MANAGER];
PERMISSIONS['Employee'] = PERMISSIONS[ROLES.EMPLOYEE];
PERMISSIONS['HR_PAYROLL_ADMIN'] = PERMISSIONS[ROLES.HR_PAYROLL_MANAGER];
PERMISSIONS['PAYROLL_ADMIN'] = PERMISSIONS[ROLES.HR_PAYROLL_MANAGER];
PERMISSIONS['PAYROLL_USER'] = PERMISSIONS[ROLES.HR_PAYROLL_USER];
PERMISSIONS['TIMEOFF_ADMIN'] = PERMISSIONS[ROLES.HR_MANAGER];
PERMISSIONS['TIMEOFF_USER'] = PERMISSIONS[ROLES.EMPLOYEE];

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
      // Only HR, Admin, Payroll users can access the full company employee directory
      return hasPermission(userRole, 'employees.read') === 'all' || hasPermission(userRole, 'employees.create') === true;
    case 'departments':
      return hasPermission(userRole, 'departments.manage') === true;
    case 'contracts':
      return hasPermission(userRole, 'contracts.manage') === true || hasPermission(userRole, 'contracts.read') === 'all';
    case 'schedules':
      return hasPermission(userRole, 'attendance.correct') === true || roleKey === 'HR_MANAGER';
    case 'attendance':
      return hasPermission(userRole, 'attendance.read') !== false;
    case 'timeoff':
      return hasPermission(userRole, 'timeoff.read') !== false;
    case 'payroll':
      return (
        hasPermission(userRole, 'payroll.payruns.read') === 'all' ||
        hasPermission(userRole, 'payroll.structures.read') === 'all'
      );
    case 'users':
      return hasPermission(userRole, 'users.manage') === true;
    default:
      return true;
  }
}

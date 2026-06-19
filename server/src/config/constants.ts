export const ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  EMPLOYEE: 'employee',
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

export const LEAVE_TYPES = ['sick', 'casual', 'earned'] as const;
export const LEAVE_STATUSES = ['pending', 'approved', 'rejected'] as const;
export const EMPLOYMENT_TYPES = ['full-time', 'part-time', 'contract'] as const;
export const EMPLOYEE_STATUSES = ['active', 'on-leave', 'terminated'] as const;

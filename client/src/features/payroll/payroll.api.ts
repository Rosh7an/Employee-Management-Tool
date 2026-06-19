import api from '../../lib/axios';

export interface PayrollRecord {
  _id: string;
  employeeId: { _id: string; name: string; employeeId: string } | string;
  payPeriod: string;
  base: number;
  bonuses: number;
  deductions: number;
  netPay: number;
  currency: string;
  createdAt: string;
}

export const payrollApi = {
  list: (params?: { employeeId?: string; year?: number; month?: number; page?: number; sort?: 'asc' | 'desc' }) =>
    api.get('/payroll', { params }),
};

import api from '../../lib/axios';

export interface Employee {
  _id: string;
  employeeId: string;
  name: string;
  email: string;
  phone?: string;
  department?: { _id: string; name: string } | null;
  managerId?: { _id: string; name: string } | null;
  designation: string;
  employmentType: 'full-time' | 'part-time' | 'contract';
  status: 'active' | 'on-leave' | 'terminated';
  salary?: { base: number; currency: string };
  dateOfJoining: string;
  createdAt: string;
}

export interface ListParams {
  page?: number;
  limit?: number;
  search?: string;
  department?: string;
  status?: string;
  unassigned?: boolean;
  managersOnly?: boolean;
}

export interface CreateEmployeeInput {
  name: string;
  email: string;
  phone?: string;
  designation: string;
  department?: string;
  managerId?: string;
  employmentType?: 'full-time' | 'part-time' | 'contract';
  salary?: { base: number; currency: string };
  dateOfJoining?: string;
}

export const employeesApi = {
  list: (params: ListParams = {}) => api.get('/employees', { params }),
  get: (id: string) => api.get(`/employees/${id}`),
  create: (data: CreateEmployeeInput) => api.post('/employees', data),
  update: (id: string, data: Partial<CreateEmployeeInput> & { status?: string }) =>
    api.patch(`/employees/${id}`, data),
  terminate: (id: string) => api.patch(`/employees/${id}`, { status: 'terminated' }),
};

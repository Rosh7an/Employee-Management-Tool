import api from '../../lib/axios';

export interface Department {
  _id: string;
  name: string;
  description?: string;
  managerId?: { _id: string; name: string } | null;
  headcount?: number;
  createdAt: string;
}

export interface DeptEmployee {
  _id: string;
  employeeId: string;
  name: string;
  designation: string;
  employmentType: string;
  managerId?: { _id: string; name: string } | null;
  status: string;
}

export interface DepartmentDetail extends Department {
  managerId?: {
    _id: string;
    name: string;
    designation?: string;
    employeeId?: string;
    managerId?: { _id: string; name: string; designation?: string } | null;
  } | null;
  employees: DeptEmployee[];
  ongoingProjects: number;
  progression: number;
}

export const departmentsApi = {
  list: () => api.get('/departments'),
  getById: (id: string) => api.get(`/departments/${id}`),
  create: (data: { name: string; description?: string; managerId?: string | null }) =>
    api.post('/departments', data),
  update: (id: string, data: { name?: string; description?: string; managerId?: string | null }) =>
    api.patch(`/departments/${id}`, data),
  remove: (id: string) => api.delete(`/departments/${id}`),
};

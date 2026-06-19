import api from '../../lib/axios';

export interface Department {
  _id: string;
  name: string;
  description?: string;
  managerId?: { _id: string; name: string } | null;
  headcount?: number;
  createdAt: string;
}

export const departmentsApi = {
  list: () => api.get('/departments'),
  create: (data: { name: string; description?: string; managerId?: string }) =>
    api.post('/departments', data),
  update: (id: string, data: { name?: string; description?: string; managerId?: string }) =>
    api.patch(`/departments/${id}`, data),
  remove: (id: string) => api.delete(`/departments/${id}`),
};

import api from '../../lib/axios';

export interface PerformanceReview {
  _id: string;
  employeeId: { _id: string; name: string; employeeId: string; designation?: string } | string;
  reviewerId: { _id: string; name: string } | string;
  period: string;
  rating: 1 | 2 | 3 | 4 | 5;
  notes: string;
  createdAt: string;
}

export interface PerformanceQuarter {
  _id: string;
  period: string;
  year: number;
  quarter: 1 | 2 | 3 | 4;
  dueDate: string;
  status: 'open' | 'locked';
  startedBy: string;
  createdAt: string;
}

export const performanceApi = {
  list: (params?: { page?: number; employeeId?: string }) => api.get('/performance', { params }),
  listByEmployee: (empId: string) => api.get(`/performance/employee/${empId}`),
  create: (data: { employeeId: string; period: string; rating: number; notes: string }) =>
    api.post('/performance', data),
  update: (id: string, data: { period?: string; rating?: number; notes?: string }) =>
    api.patch(`/performance/${id}`, data),
  delete: (id: string) => api.delete(`/performance/${id}`),
  listQuarters: () => api.get('/performance/quarters'),
  createQuarter: (data: { period: string; dueDate: string }) =>
    api.post('/performance/quarters', data),
  lockQuarter: (id: string) => api.patch(`/performance/quarters/${id}/lock`),
  unlockQuarter: (id: string) => api.patch(`/performance/quarters/${id}/unlock`),
};

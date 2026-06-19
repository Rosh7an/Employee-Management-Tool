import api from '../../lib/axios';

export interface Milestone {
  _id: string;
  title: string;
  description?: string;
  targetDate: string;
  status: 'not-started' | 'in-progress' | 'achieved';
  createdBy: { _id: string; name: string } | string;
  createdAt: string;
}

export const milestonesApi = {
  list: () => api.get('/milestones'),
  create: (data: { title: string; description?: string; targetDate: string; status?: string }) =>
    api.post('/milestones', data),
  update: (id: string, data: Partial<{ title: string; description: string; targetDate: string; status: string }>) =>
    api.patch(`/milestones/${id}`, data),
  delete: (id: string) => api.delete(`/milestones/${id}`),
};

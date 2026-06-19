import api from '../../lib/axios';

export interface LeaveRequest {
  _id: string;
  employeeId: { _id: string; name: string; employeeId: string } | string;
  type: string;
  startDate: string;
  endDate: string;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: { _id: string; name: string } | string | null;
  reviewedAt?: string | null;
  reviewNote?: string;
  createdAt: string;
}

export const leaveApi = {
  list: (params?: { status?: string; page?: number }) => api.get('/leave', { params }),
  create: (data: { type: string; startDate: string; endDate: string; reason?: string }) =>
    api.post('/leave', data),
  review: (id: string, data: { status: 'approved' | 'rejected'; reviewNote?: string }) =>
    api.patch(`/leave/${id}/review`, data),
};

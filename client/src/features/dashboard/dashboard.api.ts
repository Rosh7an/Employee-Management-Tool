import api from '../../lib/axios';

export interface DashboardStats {
  totalEmployees: number;
  activeEmployees: number;
  pendingLeaves: number;
  totalDepartments: number;
  onLeaveToday?: number;
  recentHires?: number;
}

export const dashboardApi = {
  stats: () => api.get('/dashboard/stats'),
};

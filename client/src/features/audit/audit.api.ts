import api from '../../lib/axios';

export interface AuditLog {
  _id: string;
  actorId: { _id: string; name: string; email: string } | string;
  actorRole: string;
  action: string;
  targetId: string | null;
  targetModel: string | null;
  diff: Record<string, unknown>;
  ip: string;
  timestamp: string;
}

export interface AuditListParams {
  page?: number;
  search?: string;
  actorRole?: string;
  from?: string;
  to?: string;
}

export const auditApi = {
  list: (params?: AuditListParams) => api.get('/audit', { params }),
};

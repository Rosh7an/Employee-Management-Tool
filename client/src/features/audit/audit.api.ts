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

export const auditApi = {
  list: (params?: { page?: number; action?: string }) =>
    api.get('/audit', { params }),
};

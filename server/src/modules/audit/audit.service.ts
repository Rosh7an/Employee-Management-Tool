import AuditLog from '../../models/AuditLog';
import { parsePagination, buildMeta } from '../../shared/utils/pagination';
import { Request } from 'express';

export async function getAll(req: Request) {
  const { page, limit, skip } = parsePagination(req);

  const filter: Record<string, unknown> = {};
  if (req.query.actorId) filter.actorId = req.query.actorId;
  if (req.query.action) filter.action = new RegExp(String(req.query.action), 'i');
  if (req.query.from || req.query.to) {
    filter.timestamp = {
      ...(req.query.from ? { $gte: new Date(req.query.from as string) } : {}),
      ...(req.query.to ? { $lte: new Date(req.query.to as string) } : {}),
    };
  }

  const [logs, total] = await Promise.all([
    AuditLog.find(filter)
      .populate('actorId', 'name email')
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    AuditLog.countDocuments(filter),
  ]);

  return { data: logs, meta: buildMeta(page, limit, total) };
}

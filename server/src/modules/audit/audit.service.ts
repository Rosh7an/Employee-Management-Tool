import AuditLog from '../../models/AuditLog';
import User from '../../models/User';
import { parsePagination, buildMeta } from '../../shared/utils/pagination';
import { Request } from 'express';

export async function getAll(req: Request) {
  const { page, limit, skip } = parsePagination(req);

  const filter: Record<string, unknown> = {};

  if (req.query.search) {
    const re = new RegExp(String(req.query.search), 'i');
    const matchedUsers = await User.find({ name: re }, '_id').lean();
    filter.$or = [
      { action: re },
      { targetModel: re },
      { actorId: { $in: matchedUsers.map((u) => u._id) } },
    ];
  }

  if (req.query.actorRole) filter.actorRole = String(req.query.actorRole);

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

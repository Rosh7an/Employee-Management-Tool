import { Request, Response, NextFunction } from 'express';
import AuditLog from '../../models/AuditLog';

interface AuditOptions {
  action: string;
  targetModel: string;
  getTargetId?: (req: Request) => string | null;
  getDiff?: (req: Request) => Record<string, unknown>;
}

export function auditLog(opts: AuditOptions) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const originalJson = res.json.bind(res);

    res.json = function (body: unknown) {
      const isSuccess = res.statusCode < 400;
      if (isSuccess && req.user) {
        AuditLog.create({
          actorId: req.user.userId,
          actorRole: req.user.role,
          action: opts.action,
          targetId: opts.getTargetId ? opts.getTargetId(req) : (String(req.params.id) || null),
          targetModel: opts.targetModel,
          diff: opts.getDiff ? opts.getDiff(req) : req.body,
          ip: req.ip || '',
          timestamp: new Date(),
        }).catch(() => {});
      }
      return originalJson(body);
    };

    next();
  };
}

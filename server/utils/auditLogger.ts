import { Request } from 'express';
import mongoose from 'mongoose';
import AuditLog from '../models/AuditLog.js';

interface ILogSecurityEventParams {
  userId?: mongoose.Types.ObjectId | string;
  actorId?: mongoose.Types.ObjectId | string;
  actorRole?: string;
  email?: string;
  action: string;
  resource: string;
  resourceId?: string;
  targetEmployeeId?: mongoose.Types.ObjectId | string;
  status: 'success' | 'denied' | 'error';
  details?: any;
  req?: Request;
}

export const logSecurityEvent = async ({
  userId,
  actorId,
  actorRole,
  email,
  action,
  resource,
  resourceId,
  targetEmployeeId,
  status,
  details,
  req
}: ILogSecurityEventParams): Promise<void> => {
  try {
    const ipAddress = req ? ((req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress) : undefined;
    
    // Resolve actor details automatically from request if available
    const resolvedActorId = actorId || userId || (req && (req as any).user?._id);
    const resolvedActorRole = actorRole || (req && (req as any).user?.role);
    const resolvedEmail = email || (req && (req as any).user?.email);

    const log = new AuditLog({
      userId: resolvedActorId ? new mongoose.Types.ObjectId(resolvedActorId.toString()) : undefined,
      actorId: resolvedActorId ? new mongoose.Types.ObjectId(resolvedActorId.toString()) : undefined,
      actorRole: resolvedActorRole,
      email: resolvedEmail,
      action,
      resource,
      resourceId,
      targetEmployeeId: targetEmployeeId ? new mongoose.Types.ObjectId(targetEmployeeId.toString()) : undefined,
      status,
      details,
      ipAddress,
    });
    
    await log.save();
    console.log(`[AUDIT LOG] Action: ${action} | User: ${resolvedEmail || 'Anonymous'} | Status: ${status}`);
  } catch (error) {
    console.error('Failed to write audit log:', error);
  }
};

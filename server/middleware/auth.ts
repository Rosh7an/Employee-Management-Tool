import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User, { IUserDocument } from '../models/User.js';
import { logSecurityEvent } from '../utils/auditLogger.js';

export interface AuthenticatedRequest extends Request {
  user?: IUserDocument;
  permissionScope?: 'self' | 'team' | 'global';
}

interface IDecodedToken {
  userId: string;
  email: string;
  iat: number;
  exp: number;
}

export const authenticateToken = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Authentication token is missing' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret') as IDecodedToken;
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({ message: 'User no longer exists' });
    }

    if (user.status === 'suspended') {
      await logSecurityEvent({
        userId: user._id.toString(),
        email: user.email,
        action: 'auth_attempt_suspended',
        resource: 'user',
        status: 'denied',
        details: { reason: 'User account is suspended' },
        req: req as any,
      });
      return res.status(403).json({ message: 'Your account has been suspended' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Authentication token is invalid or expired' });
  }
};

export const requirePermission = (action: string) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // Requires authenticateToken middleware to have run first
    if (!req.user) {
      return res.status(500).json({ message: 'Authentication middleware was not run prior to permission check' });
    }

    const { allowed, scope, reason } = req.user.hasActivePermission(action);

    if (!allowed) {
      // Extract resource details if possible from URL parameters
      const resourceId = req.params.id as string | undefined;
      const resourceType = req.baseUrl.replace('/api/', '') || 'resource';

      await logSecurityEvent({
        userId: req.user._id.toString(),
        email: req.user.email,
        action: `denied:${action}`,
        resource: resourceType,
        resourceId,
        status: 'denied',
        details: { reason },
        req: req as any,
      });

      return res.status(403).json({
        message: `Access denied. ${reason}`,
        code: 'INSUFFICIENT_PERMISSIONS',
      });
    }

    // Pass the resolved scope to the request object for downstream controllers
    req.permissionScope = scope as 'self' | 'team' | 'global';
    next();
  };
};

export const requireAdmin = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(500).json({ message: 'Authentication middleware was not run prior to admin check' });
  }

  if (req.user.role !== 'Admin') {
    await logSecurityEvent({
      userId: req.user._id.toString(),
      email: req.user.email,
      action: 'denied:admin_access',
      resource: 'admin',
      status: 'denied',
      details: { reason: 'User is not an Administrator' },
      req: req as any,
    });

    return res.status(403).json({ message: 'Access denied. Administrator privileges required.' });
  }

  next();
};

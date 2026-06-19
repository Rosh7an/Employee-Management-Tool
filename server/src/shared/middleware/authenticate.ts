import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { ApiError } from '../utils/ApiError';
import { Role } from '../../config/constants';

interface JwtPayload {
  userId: string;
  role: Role;
  employeeId: string | null;
  departmentId: string | null;
  isDirector: boolean;
}

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(ApiError.unauthenticated());
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    req.user = {
      userId: payload.userId,
      role: payload.role,
      employeeId: payload.employeeId,
      departmentId: payload.departmentId,
      isDirector: payload.isDirector ?? false,
    };
    next();
  } catch {
    next(ApiError.unauthenticated('Invalid or expired token.'));
  }
}

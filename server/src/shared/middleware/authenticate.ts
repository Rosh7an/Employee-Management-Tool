import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { ApiError } from '../utils/ApiError';
import { Role } from '../../config/constants';
import Employee from '../../models/Employee';

interface JwtPayload {
  userId: string;
  role: Role;
  employeeId: string | null;
  departmentId: string | null;
  isDirector: boolean;
}

export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(ApiError.unauthenticated());
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;

    // Always fetch a fresh departmentId so transfers take effect immediately
    let departmentId: string | null = payload.departmentId;
    if (payload.employeeId) {
      const emp = await Employee.findById(payload.employeeId).select('department').lean();
      departmentId = emp?.department ? emp.department.toString() : null;
    }

    req.user = {
      userId: payload.userId,
      role: payload.role,
      employeeId: payload.employeeId,
      departmentId,
      isDirector: payload.isDirector ?? false,
    };
    next();
  } catch {
    next(ApiError.unauthenticated('Invalid or expired token.'));
  }
}

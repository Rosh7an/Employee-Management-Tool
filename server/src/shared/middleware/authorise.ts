import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError';
import { Role } from '../../config/constants';

export function authorise(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!roles.includes(req.user.role as Role)) {
      return next(ApiError.forbidden());
    }
    next();
  };
}

import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError';
import { Role } from '../../config/constants';

export interface TimeWindowOptions {
  /** Days of week when access is allowed (0=Sun … 6=Sat). Default: Mon–Fri. */
  allowedDays?: number[];
  /** First allowed UTC hour, inclusive (0–23). Default: 8. */
  startHour?: number;
  /** First blocked UTC hour, exclusive (0–23). Default: 20. */
  endHour?: number;
  /** Roles that skip the time check entirely. Default: ['admin']. */
  bypassRoles?: Role[];
}

export function timeWindow(options: TimeWindowOptions = {}) {
  const {
    allowedDays = [1, 2, 3, 4, 5],
    startHour = 8,
    endHour = 20,
    bypassRoles = ['admin'],
  } = options;

  return function timeWindowGuard(req: Request, _res: Response, next: NextFunction): void {
    const role = req.user?.role as Role | undefined;
    if (role && bypassRoles.includes(role)) {
      return next();
    }

    const now = new Date();
    const day = now.getUTCDay();
    const hour = now.getUTCHours();

    const dayAllowed = allowedDays.includes(day);
    const hourAllowed = hour >= startHour && hour < endHour;

    if (!dayAllowed || !hourAllowed) {
      const days = 'Mon–Fri';
      return next(
        new ApiError(
          403,
          'TIME_RESTRICTED',
          `This action is only permitted ${days}, ${startHour}:00–${endHour}:00 UTC.`
        )
      );
    }

    next();
  };
}

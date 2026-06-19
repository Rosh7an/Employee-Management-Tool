import { Request, Response, NextFunction } from 'express';
import Employee from '../../models/Employee';
import { ApiError } from '../../shared/utils/ApiError';

export async function scopeEmployee(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const target = await Employee.findById(String(req.params.id)).lean();
  if (!target) return next(ApiError.notFound('Employee not found.'));

  const { role, employeeId, departmentId } = req.user;

  if (role === 'admin') return next();

  if (role === 'manager') {
    if (!target.department || target.department.toString() !== departmentId) {
      return next(
        ApiError.forbidden('You can only access employees in your department.')
      );
    }
    return next();
  }

  // employee: own record only
  if (!employeeId || target._id.toString() !== employeeId) {
    return next(ApiError.forbidden('You can only access your own record.'));
  }

  next();
}

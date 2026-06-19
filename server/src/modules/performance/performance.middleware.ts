import { Request, Response, NextFunction } from 'express';
import Employee from '../../models/Employee';
import { ApiError } from '../../shared/utils/ApiError';

export async function scopePerformanceCreate(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const { role, departmentId } = req.user;
  if (role === 'admin') return next();

  if (role === 'manager') {
    const targetEmployee = await Employee.findById(req.body.employeeId).lean();
    if (!targetEmployee) return next(ApiError.notFound('Employee not found.'));
    if (!targetEmployee.department || targetEmployee.department.toString() !== departmentId) {
      return next(ApiError.forbidden('You can only create reviews for employees in your department.'));
    }
    return next();
  }

  return next(ApiError.forbidden());
}

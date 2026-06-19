import { Request, Response, NextFunction } from 'express';
import LeaveRequest from '../../models/LeaveRequest';
import Employee from '../../models/Employee';
import User from '../../models/User';
import { ApiError } from '../../shared/utils/ApiError';

export async function scopeLeaveReview(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const { role, departmentId } = req.user;

  if (role === 'admin') return next();

  const leave = await LeaveRequest.findById(String(req.params.id)).lean();
  if (!leave) return next(ApiError.notFound('Leave request not found.'));

  if (role === 'manager') {
    const applicant = await Employee.findById(leave.employeeId).lean();
    if (!applicant || !applicant.department) return next(ApiError.forbidden('Cannot review this leave request.'));
    if (applicant.department.toString() !== departmentId) return next(ApiError.forbidden('You can only review leave in your department.'));

    // Managers can only approve employee-role users' leaves (not other managers/admins)
    const applicantUser = await User.findOne({ employeeId: leave.employeeId }).lean();
    if (applicantUser && applicantUser.role !== 'employee') {
      return next(ApiError.forbidden('Only admins can approve leave for managers and directors.'));
    }
    return next();
  }

  // employee cannot review leave requests
  return next(ApiError.forbidden('Employees cannot approve or reject leave requests.'));
}

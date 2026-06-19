import mongoose from 'mongoose';
import LeaveRequest from '../../models/LeaveRequest';
import Employee from '../../models/Employee';
import { ApiError } from '../../shared/utils/ApiError';
import { parsePagination, buildMeta } from '../../shared/utils/pagination';
import { Request } from 'express';
import type { SubmitLeaveInput, ReviewLeaveInput } from './leave.schema';

export async function getAll(req: Request) {
  const { role, employeeId, departmentId } = req.user;
  const { page, limit, skip } = parsePagination(req);

  const filter: Record<string, unknown> = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.type) filter.type = req.query.type;

  if (role === 'employee') {
    filter.employeeId = employeeId;
  } else if (role === 'manager') {
    const deptEmployees = await Employee.find({ department: departmentId }, '_id').lean();
    filter.employeeId = { $in: deptEmployees.map((e) => e._id) };
  }

  const [leaves, total] = await Promise.all([
    LeaveRequest.find(filter)
      .populate('employeeId', 'name employeeId')
      .populate('reviewedBy', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    LeaveRequest.countDocuments(filter),
  ]);

  return { data: leaves, meta: buildMeta(page, limit, total) };
}

export async function submit(input: SubmitLeaveInput, req: Request) {
  if (req.user.isDirector) {
    throw ApiError.forbidden('Company director is exempt from leave requests.');
  }

  const { employeeId } = req.user;
  if (!employeeId) throw ApiError.forbidden('No employee record linked to your account.');

  const employee = await Employee.findById(employeeId).lean();
  if (!employee) throw ApiError.notFound('Employee record not found.');
  if (employee.status === 'terminated') {
    throw ApiError.forbidden('Terminated employees cannot submit leave requests.');
  }

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  if (input.startDate < now) {
    throw ApiError.validation('Leave start date cannot be in the past.', 'startDate');
  }
  if (input.endDate < input.startDate) {
    throw ApiError.validation('End date must be on or after start date.', 'endDate');
  }

  // Check for overlapping leave
  const overlap = await LeaveRequest.findOne({
    employeeId,
    status: { $ne: 'rejected' },
    $or: [
      { startDate: { $lte: input.endDate }, endDate: { $gte: input.startDate } },
    ],
  });
  if (overlap) {
    throw ApiError.conflict(
      `You already have a ${overlap.status} leave request overlapping these dates.`
    );
  }

  return LeaveRequest.create({ ...input, employeeId });
}

export async function review(id: string, input: ReviewLeaveInput, reviewerId: string) {
  const leave = await LeaveRequest.findById(id);
  if (!leave) throw ApiError.notFound('Leave request not found.');

  if (leave.status !== 'pending') {
    throw ApiError.conflict('This leave request has already been reviewed.');
  }

  const employee = await Employee.findById(leave.employeeId).lean();
  if (!employee) throw ApiError.notFound('Employee not found.');
  if (employee.status === 'terminated') {
    throw ApiError.forbidden('Cannot approve leave for a terminated employee.');
  }

  leave.status = input.status;
  leave.reviewedBy = new mongoose.Types.ObjectId(reviewerId);
  leave.reviewedAt = new Date();
  await leave.save();

  return leave;
}

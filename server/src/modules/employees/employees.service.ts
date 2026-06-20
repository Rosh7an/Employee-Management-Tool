import mongoose from 'mongoose';
import Employee from '../../models/Employee';
import Department from '../../models/Department';
import LeaveRequest from '../../models/LeaveRequest';
import User from '../../models/User';

import { ApiError } from '../../shared/utils/ApiError';
import { escapeRegex } from '../../shared/utils/escapeRegex';
import { parsePagination, buildMeta } from '../../shared/utils/pagination';
import { Request } from 'express';
import type { CreateEmployeeInput, UpdateEmployeeInput } from './employees.schema';

function stripSalary(emp: Record<string, unknown>, role: string) {
  if (role === 'admin') return emp;
  const { salary: _salary, ...rest } = emp;
  return rest;
}

export async function getAll(req: Request) {
  const { role, employeeId, departmentId } = req.user;
  const { page, limit, skip } = parsePagination(req);

  const filter: Record<string, unknown> = {};

  if (req.query.managersOnly === 'true') {
    const managerUsers = await User.find({ role: 'manager' }, 'employeeId').lean();
    const managerEmpIds = managerUsers.map((u) => u.employeeId).filter(Boolean);
    filter._id = { $in: managerEmpIds };
  }

  if (req.query.status) filter.status = req.query.status;
  if (req.query.unassigned === 'true') {
    filter.department = null;
  } else if (req.query.department) {
    filter.department = req.query.department;
  }
  if (req.query.search) {
    const tokens = String(req.query.search).trim().split(/\s+/).filter(Boolean);
    const orClauses = (
      await Promise.all(
        tokens.map(async (token) => {
          const re = new RegExp(escapeRegex(token), 'i');
          const matchedDepts = await Department.find({ name: re }, '_id').lean();
          return [
            { employeeId: re },
            { name: re },
            { email: re },
            { phone: re },
            { designation: re },
            { employmentType: re },
            { status: re },
            { department: { $in: matchedDepts.map((d) => d._id) } },
          ];
        })
      )
    ).flat();
    filter.$or = orClauses;
  }

  if (role === 'manager') {
    filter.department = departmentId;
  } else if (role === 'employee' && !departmentId) {
    // Unassigned employees can only see themselves
    filter._id = employeeId;
  }
  // Assigned employees (departmentId set) see all — salary stripped downstream

  const [employees, total] = await Promise.all([
    Employee.find(filter)
      .populate('department', 'name')
      .populate('managerId', 'name employeeId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Employee.countDocuments(filter),
  ]);

  const data = employees.map((e) => stripSalary(e, role));
  return { data, meta: buildMeta(page, limit, total) };
}

export async function getById(id: string, role: string) {
  const emp = await Employee.findById(id)
    .populate('department', 'name')
    .populate('managerId', 'name employeeId')
    .lean();
  if (!emp) throw ApiError.notFound('Employee not found.');
  return stripSalary(emp, role);
}

export async function create(input: CreateEmployeeInput) {
  const existing = await Employee.findOne({ email: input.email.toLowerCase() });
  if (existing) throw ApiError.conflict('An employee with this email already exists.', 'email');

  const employee = await Employee.create({
    ...input,
    email: input.email.toLowerCase(),
    employeeId: '',
  });

  // If a User account exists with this email, link it
  const user = await User.findOne({ email: input.email.toLowerCase() });
  if (user && !user.employeeId) {
    user.employeeId = employee._id as mongoose.Types.ObjectId;
    await user.save();
  }

  return employee;
}

export async function update(
  id: string,
  input: UpdateEmployeeInput,
  role: string
) {
  const emp = await Employee.findById(id);
  if (!emp) throw ApiError.notFound('Employee not found.');

  // Field-level restriction based on role
  let allowedFields: (keyof UpdateEmployeeInput)[];

  if (role === 'admin') {
    // name and email are set at registration and treated as identity — exclude from PATCH
    allowedFields = (Object.keys(input) as (keyof UpdateEmployeeInput)[]).filter(
      (k) => k !== 'name' && k !== 'email'
    );
  } else if (role === 'manager') {
    if (input.status === 'terminated') {
      throw ApiError.forbidden('Only admins can terminate employees.');
    }
    // Managers can only update employee-role users, not other managers or admins
    const targetUser = await User.findOne({ employeeId: id }).lean();
    if (targetUser && targetUser.role !== 'employee') {
      throw ApiError.forbidden('Managers can only update employee records, not other managers or admins.');
    }
    allowedFields = ['status'];
  } else {
    // employee: phone only — name changes require admin/HR
    allowedFields = ['phone'];
  }

  // Guard against email collision before mutating
  if (role === 'admin' && input.email) {
    const emailConflict = await Employee.findOne({
      email: input.email.toLowerCase(),
      _id: { $ne: emp._id },
    }).lean();
    if (emailConflict) throw ApiError.conflict('An employee with this email already exists.', 'email');
  }

  for (const key of allowedFields) {
    if (key in input && input[key] !== undefined) {
      (emp as unknown as Record<string, unknown>)[key] = input[key];
    }
  }

  await emp.save();

  // Keep the linked User account email in sync
  if (role === 'admin' && input.email) {
    await User.findOneAndUpdate(
      { employeeId: emp._id },
      { email: input.email.toLowerCase() }
    );
  }

  return emp;
}

export async function terminate(id: string) {
  const emp = await Employee.findById(id);
  if (!emp) throw ApiError.notFound('Employee not found.');
  if (emp.status === 'terminated') {
    throw ApiError.conflict('Employee is already terminated.');
  }

  const linkedUser = await User.findOne({ employeeId: id }).lean();
  if (linkedUser?.isDirector) throw ApiError.forbidden('Cannot terminate the company director.');

  emp.status = 'terminated';
  await emp.save();

  // Auto-reject all pending and approved leave requests
  await LeaveRequest.updateMany(
    { employeeId: id, status: { $in: ['pending', 'approved'] } },
    { status: 'rejected', reviewedAt: new Date() }
  );

  return emp;
}

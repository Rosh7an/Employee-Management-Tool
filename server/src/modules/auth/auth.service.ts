import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../../models/User';
import Employee from '../../models/Employee';
import { env } from '../../config/env';
import { ApiError } from '../../shared/utils/ApiError';
import type { RegisterInput, LoginInput, ChangePasswordInput } from './auth.schema';

function generateToken(payload: {
  userId: string;
  role: string;
  employeeId: string | null;
  departmentId: string | null;
  isDirector: boolean;
}): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] });
}

export async function register(input: RegisterInput) {
  const existing = await User.findOne({ email: input.email.toLowerCase() });
  if (existing) {
    throw ApiError.conflict('An account with this email already exists.', 'email');
  }

  const passwordHash = await bcrypt.hash(input.password, 10);

  // Link to an existing Employee record if one exists with same email
  let employee = await Employee.findOne({ email: input.email.toLowerCase() });

  if (!employee) {
    // Create a bare employee record (admin fills in details later)
    employee = await Employee.create({
      employeeId: '',
      name: input.name,
      email: input.email.toLowerCase(),
      designation: 'Pending',
      department: null,
      status: 'active',
      dateOfJoining: new Date(),
    });
  }

  const user = await User.create({
    name: input.name,
    email: input.email.toLowerCase(),
    passwordHash,
    role: 'employee',
    employeeId: employee._id,
  });

  const token = generateToken({
    userId: user._id.toString(),
    role: user.role,
    employeeId: employee._id.toString(),
    departmentId: employee.department ? employee.department.toString() : null,
    isDirector: false,
  });

  return { token, user: { _id: user._id, name: user.name, email: user.email, role: user.role } };
}

export async function login(input: LoginInput) {
  const user = await User.findOne({ email: input.email.toLowerCase() });
  if (!user) {
    // Generic message to prevent account enumeration
    throw ApiError.unauthenticated('Invalid email or password.');
  }

  const valid = await bcrypt.compare(input.password, user.passwordHash);
  if (!valid) {
    throw ApiError.unauthenticated('Invalid email or password.');
  }

  const employee = user.employeeId
    ? await Employee.findById(user.employeeId)
    : null;

  const token = generateToken({
    userId: user._id.toString(),
    role: user.role,
    employeeId: employee ? employee._id.toString() : null,
    departmentId: employee?.department ? employee.department.toString() : null,
    isDirector: user.isDirector ?? false,
  });

  return {
    token,
    user: { _id: user._id, name: user.name, email: user.email, role: user.role, isDirector: user.isDirector ?? false },
  };
}

export async function changePassword(userId: string, input: ChangePasswordInput) {
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound('User not found.');

  const valid = await bcrypt.compare(input.currentPassword, user.passwordHash);
  if (!valid) throw ApiError.unauthenticated('Current password is incorrect.');

  user.passwordHash = await bcrypt.hash(input.newPassword, 10);
  await user.save();
}

export async function getMe(userId: string): Promise<{ user: Record<string, unknown>; employee: Record<string, unknown> | null }> {
  const user = await User.findById(userId).lean();
  if (!user) throw ApiError.notFound('User not found.');

  const employee = user.employeeId
    ? await Employee.findById(user.employeeId)
        .populate('department', 'name')
        .lean()
    : null;

  return { user: { ...user, isDirector: user.isDirector ?? false }, employee };
}

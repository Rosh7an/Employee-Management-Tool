import Payroll from '../../models/Payroll';
import Employee from '../../models/Employee';
import { ApiError } from '../../shared/utils/ApiError';
import { parsePagination, buildMeta } from '../../shared/utils/pagination';
import { Request } from 'express';
import type { CreatePayrollInput } from './payroll.schema';

export async function getAll(req: Request) {
  const { role, employeeId, departmentId } = req.user;
  const { page, limit, skip } = parsePagination(req);

  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const filter: Record<string, unknown> = {};

  const qYear  = req.query.year  ? String(req.query.year)  : '';
  const qMonth = req.query.month ? Number(req.query.month) : 0;
  if (qYear && qMonth) {
    const mon = MONTHS[qMonth - 1] || '';
    if (mon) filter.payPeriod = `${mon} ${qYear}`;
  } else if (qYear) {
    filter.payPeriod = { $regex: qYear };
  } else if (qMonth) {
    const mon = MONTHS[qMonth - 1] || '';
    if (mon) filter.payPeriod = { $regex: `^${mon}` };
  } else if (req.query.payPeriod) {
    filter.payPeriod = req.query.payPeriod;
  }

  if (role === 'employee') {
    filter.employeeId = employeeId;
  } else if (role === 'manager') {
    const deptEmployees = await Employee.find({ department: departmentId }, '_id').lean();
    filter.employeeId = { $in: deptEmployees.map((e) => e._id) };
  }

  const sortDir = req.query.sort === 'asc' ? 1 : -1;

  const [records, total] = await Promise.all([
    Payroll.find(filter)
      .populate('employeeId', 'name employeeId')
      .sort({ createdAt: sortDir })
      .skip(skip)
      .limit(limit)
      .lean(),
    Payroll.countDocuments(filter),
  ]);

  return { data: records, meta: buildMeta(page, limit, total) };
}

export async function getByEmployee(targetEmployeeId: string, req: Request) {
  const { role, employeeId, departmentId } = req.user;

  // Scope check
  if (role === 'employee' && targetEmployeeId !== employeeId) {
    throw ApiError.forbidden('You can only view your own payroll records.');
  }
  if (role === 'manager') {
    const emp = await Employee.findById(targetEmployeeId).lean();
    if (!emp || emp.department?.toString() !== departmentId) {
      throw ApiError.forbidden('You can only view payroll for employees in your department.');
    }
  }

  const filter: Record<string, unknown> = { employeeId: targetEmployeeId };
  if (req.query.payPeriod) filter.payPeriod = req.query.payPeriod;

  const records = await Payroll.find(filter).sort({ createdAt: -1 }).lean();
  return records;
}

export async function create(input: CreatePayrollInput) {
  const emp = await Employee.findById(input.employeeId).lean();
  if (!emp) throw ApiError.notFound('Employee not found.');

  const existing = await Payroll.findOne({ employeeId: input.employeeId, payPeriod: input.payPeriod }).lean();
  if (existing) {
    throw ApiError.conflict(`A payroll record for "${input.payPeriod}" already exists for this employee.`);
  }

  const netPay = input.base + input.bonuses - input.deductions;
  return Payroll.create({ ...input, netPay });
}

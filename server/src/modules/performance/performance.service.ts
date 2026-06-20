import PerformanceReview from '../../models/PerformanceReview';
import PerformanceQuarter from '../../models/PerformanceQuarter';
import Employee from '../../models/Employee';
import { ApiError } from '../../shared/utils/ApiError';
import { parsePagination, buildMeta } from '../../shared/utils/pagination';
import { Request } from 'express';
import type { CreatePerformanceInput, UpdatePerformanceInput } from './performance.schema';

export async function getAll(req: Request) {
  const { role, employeeId, departmentId } = req.user;
  const { page, limit, skip } = parsePagination(req);
  const filter: Record<string, unknown> = {};
  if (role === 'employee') filter.employeeId = employeeId;
  else if (role === 'manager') {
    const deptEmployees = await Employee.find({ department: departmentId }, '_id').lean();
    filter.employeeId = { $in: deptEmployees.map((e) => e._id) };
  }
  if (req.query.employeeId && role !== 'employee') filter.employeeId = req.query.employeeId;
  const [reviews, total] = await Promise.all([
    PerformanceReview.find(filter).populate('employeeId', 'name employeeId designation').populate('reviewerId', 'name employeeId').sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    PerformanceReview.countDocuments(filter),
  ]);
  return { data: reviews, meta: buildMeta(page, limit, total) };
}

export async function getByEmployee(empId: string, req: Request) {
  const { role, employeeId, departmentId } = req.user;

  if (role === 'employee' && empId !== employeeId) {
    throw ApiError.forbidden('You can only view your own performance reviews.');
  }

  if (role === 'manager') {
    const target = await Employee.findById(empId).lean();
    if (!target || target.department?.toString() !== departmentId) {
      throw ApiError.forbidden('You can only view performance reviews for employees in your department.');
    }
  }

  return PerformanceReview.find({ employeeId: empId })
    .populate('reviewerId', 'name employeeId')
    .sort({ period: 1 })
    .lean();
}

export async function create(input: CreatePerformanceInput, reviewerId: string, reviewerRole: string) {
  const emp = await Employee.findById(input.employeeId).lean();
  if (!emp) throw ApiError.notFound('Employee not found.');

  // Managers cannot write their own performance review
  if (reviewerRole === 'manager' && input.employeeId.toString() === reviewerId?.toString()) {
    throw ApiError.forbidden('Managers cannot create a performance review for themselves.');
  }

  // Find open quarter matching this period
  const quarter = await PerformanceQuarter.findOne({ period: input.period }).lean();
  if (!quarter) {
    throw ApiError.validation(`No review period "${input.period}" has been opened by HR. Ask HR admin to start this quarter.`, 'period');
  }
  if (quarter.status === 'locked') {
    throw ApiError.validation(`Review period "${input.period}" is locked (due date passed).`, 'period');
  }
  if (new Date() > quarter.dueDate) {
    await PerformanceQuarter.findByIdAndUpdate(quarter._id, { status: 'locked' });
    throw ApiError.validation(`Review period "${input.period}" has expired and is now locked.`, 'period');
  }

  const duplicate = await PerformanceReview.findOne({
    employeeId: input.employeeId,
    period: input.period,
  }).lean();
  if (duplicate) {
    throw ApiError.conflict(`A review for "${input.period}" already exists for this employee.`);
  }

  return PerformanceReview.create({ ...input, reviewerId });
}

export async function update(id: string, input: UpdatePerformanceInput, role: string, userId: string) {
  const review = await PerformanceReview.findById(id);
  if (!review) throw ApiError.notFound('Performance review not found.');

  if (role !== 'admin' && review.reviewerId.toString() !== userId) {
    throw ApiError.forbidden('You can only edit reviews you created.');
  }

  const periodToCheck = input.period ?? review.period;
  const quarter = await PerformanceQuarter.findOne({ period: periodToCheck }).lean();
  if (quarter) {
    if (quarter.status === 'locked' && role !== 'admin') {
      throw ApiError.validation(`Review period "${periodToCheck}" is locked.`, 'period');
    }
    if (new Date() > quarter.dueDate && role !== 'admin') {
      await PerformanceQuarter.findByIdAndUpdate(quarter._id, { status: 'locked' });
      throw ApiError.validation(`Review period "${periodToCheck}" has expired.`, 'period');
    }
  }

  Object.assign(review, input);
  await review.save();
  return review;
}

export async function remove(id: string, role: string, userId: string) {
  const review = await PerformanceReview.findById(id);
  if (!review) throw ApiError.notFound('Performance review not found.');
  if (role !== 'admin' && review.reviewerId.toString() !== userId) {
    throw ApiError.forbidden('You can only delete reviews you created.');
  }
  await review.deleteOne();
}

// Quarter management
export async function listQuarters() {
  return PerformanceQuarter.find().sort({ year: -1, quarter: -1 }).lean();
}

export async function createQuarter(period: string, dueDate: Date, startedBy: string) {
  const existing = await PerformanceQuarter.findOne({ period });
  if (existing) throw ApiError.conflict(`Quarter "${period}" already exists.`);
  const m = period.match(/Q(\d)\s+(\d{4})/);
  if (!m) throw ApiError.validation('Invalid period format. Use "Q1 2026".', 'period');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (dueDate < today) throw ApiError.validation('Due date must be today or in the future.', 'dueDate');
  return PerformanceQuarter.create({
    period,
    year: parseInt(m[2]),
    quarter: parseInt(m[1]) as 1|2|3|4,
    dueDate,
    status: 'open',
    startedBy,
  });
}

export async function lockQuarter(id: string) {
  const q = await PerformanceQuarter.findByIdAndUpdate(id, { status: 'locked' }, { new: true });
  if (!q) throw ApiError.notFound('Quarter not found.');
  return q;
}

export async function unlockQuarter(id: string) {
  const q = await PerformanceQuarter.findByIdAndUpdate(id, { status: 'open' }, { new: true });
  if (!q) throw ApiError.notFound('Quarter not found.');
  return q;
}

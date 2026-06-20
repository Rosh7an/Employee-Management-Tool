import Department from '../../models/Department';
import Employee from '../../models/Employee';
import User from '../../models/User';
import Milestone from '../../models/Milestone';
import { ApiError } from '../../shared/utils/ApiError';
import type { CreateDepartmentInput, UpdateDepartmentInput } from './departments.schema';

export async function getAll(): Promise<Record<string, unknown>[]> {
  const departments = await Department.find()
    .populate('managerId', 'name employeeId')
    .lean();

  const withHeadcount = await Promise.all(
    departments.map(async (dept) => {
      const headcount = await Employee.countDocuments({
        department: dept._id,
        status: { $ne: 'terminated' },
      });
      return { ...dept, headcount };
    })
  );

  return withHeadcount;
}

export async function getById(id: string): Promise<Record<string, unknown>> {
  const dept = await Department.findById(id)
    .populate({
      path: 'managerId',
      select: 'name employeeId designation managerId',
      populate: { path: 'managerId', select: '_id name designation' },
    })
    .lean();
  if (!dept) throw ApiError.notFound('Department not found.');

  const employees = await Employee.find({ department: id, status: { $ne: 'terminated' } })
    .select('_id name employeeId designation employmentType managerId status')
    .populate('managerId', '_id name')
    .sort({ name: 1 })
    .lean();

  // Milestone metrics for this department's employees
  const empIds = employees.map((e) => e._id);
  const users = await User.find({ employeeId: { $in: empIds } }, '_id').lean();
  const userIds = users.map((u) => u._id);

  const [ongoingProjects, totalMilestones, achievedMilestones] = await Promise.all([
    Milestone.countDocuments({ createdBy: { $in: userIds }, status: 'in-progress' }),
    Milestone.countDocuments({ createdBy: { $in: userIds } }),
    Milestone.countDocuments({ createdBy: { $in: userIds }, status: 'achieved' }),
  ]);

  const progression = totalMilestones > 0
    ? Math.round((achievedMilestones / totalMilestones) * 100)
    : 0;

  return { ...dept, headcount: employees.length, employees, ongoingProjects, progression };
}

export async function create(input: CreateDepartmentInput) {
  const existing = await Department.findOne({ name: new RegExp(`^${input.name}$`, 'i') });
  if (existing) throw ApiError.conflict('A department with this name already exists.', 'name');
  return Department.create({ name: input.name, description: input.description, managerId: input.managerId ?? null });
}

export async function update(id: string, input: UpdateDepartmentInput) {
  const existing = await Department.findById(id).lean();
  if (!existing) throw ApiError.notFound('Department not found.');

  const dept = await Department.findByIdAndUpdate(
    id,
    { name: input.name, description: input.description, managerId: input.managerId ?? null },
    { new: true, omitUndefined: true }
  );
  if (!dept) throw ApiError.notFound('Department not found.');

  // Cascade manager change to every active employee in this department
  if ('managerId' in input) {
    const newManagerId = input.managerId ?? null;
    const oldManagerId = existing.managerId ? String(existing.managerId) : null;
    if (String(newManagerId) !== oldManagerId) {
      await Employee.updateMany(
        {
          department: id,
          status: { $ne: 'terminated' },
          ...(newManagerId ? { _id: { $ne: newManagerId } } : {}),
        },
        { managerId: newManagerId }
      );
    }
  }

  return dept;
}

export async function remove(id: string) {
  const headcount = await Employee.countDocuments({
    department: id,
    status: { $ne: 'terminated' },
  });
  if (headcount > 0) {
    throw ApiError.conflict(
      `Reassign ${headcount} employee${headcount > 1 ? 's' : ''} before deleting this department.`
    );
  }
  const dept = await Department.findByIdAndDelete(id);
  if (!dept) throw ApiError.notFound('Department not found.');
  return dept;
}

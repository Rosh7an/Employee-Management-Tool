import Department from '../../models/Department';
import Employee from '../../models/Employee';
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
    .populate('managerId', 'name employeeId')
    .lean();
  if (!dept) throw ApiError.notFound('Department not found.');
  const headcount = await Employee.countDocuments({
    department: id,
    status: { $ne: 'terminated' },
  });
  return { ...dept, headcount };
}

export async function create(input: CreateDepartmentInput) {
  const existing = await Department.findOne({ name: new RegExp(`^${input.name}$`, 'i') });
  if (existing) throw ApiError.conflict('A department with this name already exists.', 'name');
  return Department.create(input);
}

export async function update(id: string, input: UpdateDepartmentInput) {
  const dept = await Department.findByIdAndUpdate(id, input, { new: true });
  if (!dept) throw ApiError.notFound('Department not found.');
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

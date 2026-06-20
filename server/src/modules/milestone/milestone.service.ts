import Milestone from '../../models/Milestone';
import Employee from '../../models/Employee';
import User from '../../models/User';
import { ApiError } from '../../shared/utils/ApiError';
import type { CreateMilestoneInput, UpdateMilestoneInput } from './milestone.schema';

export async function getAll(userId: string, role: string, departmentId: string | null) {
  if (role === 'admin') {
    return Milestone.find({}).populate('createdBy', 'name').sort({ targetDate: 1 }).lean();
  }

  if (role === 'manager' && departmentId) {
    // Managers see their own milestones + all milestones created by employees in their dept
    const deptEmployees = await Employee.find({ department: departmentId }, '_id').lean();
    const deptUsers = await User.find({ employeeId: { $in: deptEmployees.map((e) => e._id) } }, '_id').lean();
    const deptUserIds = deptUsers.map((u) => u._id);
    return Milestone.find({ $or: [{ createdBy: userId }, { createdBy: { $in: deptUserIds } }] })
      .populate('createdBy', 'name')
      .sort({ targetDate: 1 })
      .lean();
  }

  return Milestone.find({ createdBy: userId }).populate('createdBy', 'name').sort({ targetDate: 1 }).lean();
}

export async function create(input: CreateMilestoneInput, userId: string) {
  const m = await Milestone.create({ ...input, createdBy: userId });
  return (await m.populate('createdBy', 'name')).toObject();
}

export async function update(id: string, input: UpdateMilestoneInput, userId: string, role: string) {
  const m = await Milestone.findById(id);
  if (!m) throw ApiError.notFound('Milestone not found.');
  if (role !== 'admin' && m.createdBy.toString() !== userId) throw ApiError.forbidden();
  Object.assign(m, input);
  await m.save();
  return (await m.populate('createdBy', 'name')).toObject();
}

export async function remove(id: string, userId: string, role: string) {
  const m = await Milestone.findById(id).lean();
  if (!m) throw ApiError.notFound('Milestone not found.');
  if (role !== 'admin' && m.createdBy.toString() !== userId) throw ApiError.forbidden();
  const deleted = await Milestone.findOneAndDelete({ _id: id, status: 'not-started' });
  if (!deleted) throw ApiError.conflict('Only not-started milestones can be deleted.');
}

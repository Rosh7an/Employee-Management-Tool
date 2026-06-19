import Milestone from '../../models/Milestone';
import { ApiError } from '../../shared/utils/ApiError';
import type { CreateMilestoneInput, UpdateMilestoneInput } from './milestone.schema';

export async function getAll(userId: string, role: string) {
  const filter = role === 'admin' ? {} : { createdBy: userId };
  return Milestone.find(filter).populate('createdBy', 'name').sort({ targetDate: 1 }).lean();
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
  const m = await Milestone.findById(id);
  if (!m) throw ApiError.notFound('Milestone not found.');
  if (role !== 'admin' && m.createdBy.toString() !== userId) throw ApiError.forbidden();
  if (m.status !== 'not-started') throw ApiError.conflict('Only not-started milestones can be deleted.');
  await m.deleteOne();
}

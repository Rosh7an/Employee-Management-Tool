import { Request, Response } from 'express';
import { createMilestoneSchema, updateMilestoneSchema } from './milestone.schema';
import * as service from './milestone.service';

export const getAll = async (req: Request, res: Response) => {
  const data = await service.getAll(String(req.user.userId), req.user.role, req.user.departmentId);
  res.json({ success: true, data });
};
export const create = async (req: Request, res: Response) => {
  const input = createMilestoneSchema.parse(req.body);
  const data = await service.create(input, String(req.user.userId));
  res.status(201).json({ success: true, data });
};
export const update = async (req: Request, res: Response) => {
  const input = updateMilestoneSchema.parse(req.body);
  const data = await service.update(String(req.params.id), input, String(req.user.userId), req.user.role);
  res.json({ success: true, data });
};
export const remove = async (req: Request, res: Response) => {
  await service.remove(String(req.params.id), String(req.user.userId), req.user.role);
  res.json({ success: true });
};

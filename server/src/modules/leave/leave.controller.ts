import { Request, Response } from 'express';
import { submitLeaveSchema, reviewLeaveSchema } from './leave.schema';
import * as service from './leave.service';
import { success } from '../../shared/utils/pagination';

export async function getAll(req: Request, res: Response): Promise<void> {
  const result = await service.getAll(req);
  res.json({ success: true, ...result });
}

export async function submit(req: Request, res: Response): Promise<void> {
  const input = submitLeaveSchema.parse(req.body);
  const leave = await service.submit(input, req);
  res.status(201).json(success(leave));
}

export async function review(req: Request, res: Response): Promise<void> {
  const input = reviewLeaveSchema.parse(req.body);
  const leave = await service.review(String(req.params.id), input, req.user.employeeId!);
  res.json(success(leave));
}

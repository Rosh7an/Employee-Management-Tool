import { Request, Response } from 'express';
import { createPerformanceSchema, updatePerformanceSchema } from './performance.schema';
import * as service from './performance.service';
import { success } from '../../shared/utils/pagination';


export async function getAll(req: Request, res: Response): Promise<void> {
  const result = await service.getAll(req);
  res.json({ success: true, ...result });
}

export async function getByEmployee(req: Request, res: Response): Promise<void> {
  const reviews = await service.getByEmployee(String(req.params.empId), req);
  res.json(success(reviews));
}

export async function create(req: Request, res: Response): Promise<void> {
  const input = createPerformanceSchema.parse(req.body);
  const review = await service.create(input, req.user.employeeId!, req.user.role);
  res.status(201).json(success(review));
}

export async function update(req: Request, res: Response): Promise<void> {
  const input = updatePerformanceSchema.parse(req.body);
  const review = await service.update(String(req.params.id), input, req.user.role, req.user.employeeId!);
  res.json(success(review));
}

export async function remove(req: Request, res: Response): Promise<void> {
  await service.remove(String(req.params.id), req.user.role, req.user.employeeId!);
  res.json(success(null));
}

export const listQuarters = async (req: Request, res: Response) => {
  const data = await service.listQuarters();
  res.json({ success: true, data });
};
export const createQuarter = async (req: Request, res: Response) => {
  const { period, dueDate } = req.body;
  const data = await service.createQuarter(String(period), new Date(dueDate), String(req.user.userId));
  res.status(201).json({ success: true, data });
};
export const lockQuarter = async (req: Request, res: Response) => {
  const data = await service.lockQuarter(String(req.params.id));
  res.json({ success: true, data });
};
export const unlockQuarter = async (req: Request, res: Response) => {
  const data = await service.unlockQuarter(String(req.params.id));
  res.json({ success: true, data });
};

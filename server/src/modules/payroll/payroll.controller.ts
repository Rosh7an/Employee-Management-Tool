import { Request, Response } from 'express';
import { createPayrollSchema } from './payroll.schema';
import * as service from './payroll.service';
import { success } from '../../shared/utils/pagination';

export async function getAll(req: Request, res: Response): Promise<void> {
  const result = await service.getAll(req);
  res.json({ success: true, ...result });
}

export async function getByEmployee(req: Request, res: Response): Promise<void> {
  const records = await service.getByEmployee(String(req.params.empId), req);
  res.json(success(records));
}

export async function create(req: Request, res: Response): Promise<void> {
  const input = createPayrollSchema.parse(req.body);
  const record = await service.create(input);
  res.status(201).json(success(record));
}

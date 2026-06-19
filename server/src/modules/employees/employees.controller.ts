import { Request, Response } from 'express';
import { createEmployeeSchema, updateEmployeeSchema } from './employees.schema';
import * as service from './employees.service';
import { success } from '../../shared/utils/pagination';

export async function getAll(req: Request, res: Response): Promise<void> {
  const result = await service.getAll(req);
  res.json({ success: true, ...result });
}

export async function getById(req: Request, res: Response): Promise<void> {
  const data = await service.getById(String(req.params.id), req.user.role);
  res.json(success(data));
}

export async function create(req: Request, res: Response): Promise<void> {
  const input = createEmployeeSchema.parse(req.body);
  const employee = await service.create(input);
  res.status(201).json(success(employee));
}

export async function update(req: Request, res: Response): Promise<void> {
  const input = updateEmployeeSchema.parse(req.body);
  const employee = await service.update(String(req.params.id), input, req.user.role);
  res.json(success(employee));
}

export async function terminate(req: Request, res: Response): Promise<void> {
  const employee = await service.terminate(String(req.params.id));
  res.json(success(employee));
}

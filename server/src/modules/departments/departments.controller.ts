import { Request, Response } from 'express';
import { createDepartmentSchema, updateDepartmentSchema } from './departments.schema';
import * as service from './departments.service';
import { success } from '../../shared/utils/pagination';

export async function getAll(_req: Request, res: Response): Promise<void> {
  const data = await service.getAll();
  res.json(success(data));
}

export async function getById(req: Request, res: Response): Promise<void> {
  const data = await service.getById(String(req.params.id));
  res.json(success(data));
}

export async function create(req: Request, res: Response): Promise<void> {
  const input = createDepartmentSchema.parse(req.body);
  const dept = await service.create(input);
  res.status(201).json(success(dept));
}

export async function update(req: Request, res: Response): Promise<void> {
  const input = updateDepartmentSchema.parse(req.body);
  const dept = await service.update(String(req.params.id), input);
  res.json(success(dept));
}

export async function remove(req: Request, res: Response): Promise<void> {
  const dept = await service.remove(String(req.params.id));
  res.json(success(dept));
}

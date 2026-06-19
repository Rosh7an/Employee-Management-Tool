import { Request, Response } from 'express';
import * as service from './audit.service';

export async function getAll(req: Request, res: Response): Promise<void> {
  const result = await service.getAll(req);
  res.json({ success: true, ...result });
}

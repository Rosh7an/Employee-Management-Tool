import { Request, Response } from 'express';
import * as service from './dashboard.service';
import { success } from '../../shared/utils/pagination';

export async function getStats(req: Request, res: Response): Promise<void> {
  const data = await service.getStats(req);
  res.json(success(data));
}

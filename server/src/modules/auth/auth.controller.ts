import { Request, Response } from 'express';
import { registerSchema, loginSchema, changePasswordSchema } from './auth.schema';
import * as authService from './auth.service';
import { success } from '../../shared/utils/pagination';

export async function register(req: Request, res: Response): Promise<void> {
  const input = registerSchema.parse(req.body);
  const result = await authService.register(input);
  res.status(201).json(success(result));
}

export async function login(req: Request, res: Response): Promise<void> {
  const input = loginSchema.parse(req.body);
  const result = await authService.login(input);
  res.status(200).json(success(result));
}

export async function changePassword(req: Request, res: Response): Promise<void> {
  const input = changePasswordSchema.parse(req.body);
  await authService.changePassword(req.user.userId, input);
  res.json(success(null));
}

export async function getMe(req: Request, res: Response): Promise<void> {
  const result = await authService.getMe(req.user.userId);
  res.status(200).json(success(result));
}

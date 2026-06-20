import { z } from 'zod';

export const createPerformanceSchema = z.object({
  employeeId: z.string().min(1),
  period: z.string().min(1, 'Period is required (e.g. Q2 2025)'),
  rating: z.number().int().min(1).max(5),
  notes: z.string().max(2000, 'Notes cannot exceed 2000 characters.').refine(
    (s) => s.trim().split(/\s+/).filter(Boolean).length >= 5,
    { message: 'Notes must contain at least 5 words.' }
  ),
});

export const updatePerformanceSchema = z.object({
  period: z.string().min(1).optional(),
  rating: z.number().int().min(1).max(5).optional(),
  notes: z.string().min(1).optional(),
});

export type CreatePerformanceInput = z.infer<typeof createPerformanceSchema>;
export type UpdatePerformanceInput = z.infer<typeof updatePerformanceSchema>;

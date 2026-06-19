import { z } from 'zod';

export const submitLeaveSchema = z.object({
  type: z.enum(['sick', 'casual', 'earned']),
  startDate: z.string().transform((v) => new Date(v)),
  endDate: z.string().transform((v) => new Date(v)),
  reason: z.string().optional().default(''),
});

export const reviewLeaveSchema = z.object({
  status: z.enum(['approved', 'rejected']),
});

export type SubmitLeaveInput = z.infer<typeof submitLeaveSchema>;
export type ReviewLeaveInput = z.infer<typeof reviewLeaveSchema>;

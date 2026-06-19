import { z } from 'zod';
export const createMilestoneSchema = z.object({
  title: z.string().min(2),
  description: z.string().transform((v) => v.trim() || undefined).optional(),
  targetDate: z.string()
    .transform((v) => new Date(v))
    .refine(
      (d) => d >= new Date(new Date().setHours(0, 0, 0, 0)),
      { message: 'Target date must be today or in the future.' }
    ),
  status: z.enum(['not-started', 'in-progress', 'achieved']).default('not-started'),
});
export const updateMilestoneSchema = createMilestoneSchema.partial();
export type CreateMilestoneInput = z.infer<typeof createMilestoneSchema>;
export type UpdateMilestoneInput = z.infer<typeof updateMilestoneSchema>;

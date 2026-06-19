import { z } from 'zod';

export const createDepartmentSchema = z
  .object({
    name: z.string().min(1, 'Department name is required'),
    description: z.string().optional(),
    managerId: z.string().optional().nullable(),
  })
  .refine(
    (data) => !data.managerId || (data.description && data.description.trim().length > 0),
    { message: 'Description is required when assigning a manager.', path: ['description'] }
  );

export const updateDepartmentSchema = z
  .object({
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    managerId: z.string().optional().nullable(),
  })
  .refine(
    (data) => !data.managerId || (data.description && data.description.trim().length > 0),
    { message: 'Description is required when assigning a manager.', path: ['description'] }
  );

export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>;
export type UpdateDepartmentInput = z.infer<typeof updateDepartmentSchema>;

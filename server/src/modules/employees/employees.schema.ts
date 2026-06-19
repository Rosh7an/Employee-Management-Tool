import { z } from 'zod';

export const createEmployeeSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  department: z.string().optional().nullable(),
  designation: z.string().min(1),
  managerId: z.string().optional().nullable(),
  employmentType: z.enum(['full-time', 'part-time', 'contract']).default('full-time'),
  status: z.enum(['active', 'on-leave', 'terminated']).default('active'),
  dateOfJoining: z.string().or(z.date()).transform((v: string | Date) => new Date(v)).optional().default(() => new Date()),
  salary: z
    .object({
      base: z.number().min(0).default(0),
      currency: z.string().default('USD'),
    })
    .optional()
    .default({ base: 0, currency: 'USD' }),
});

export const updateEmployeeSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().optional().nullable(),
  department: z.string().optional().nullable(),
  designation: z.string().min(1).optional(),
  managerId: z.string().optional().nullable(),
  employmentType: z.enum(['full-time', 'part-time', 'contract']).optional(),
  status: z.enum(['active', 'on-leave', 'terminated']).optional(),
  dateOfJoining: z
    .string()
    .or(z.date())
    .transform((v: string | Date) => new Date(v))
    .optional(),
  salary: z
    .object({ base: z.number().min(0), currency: z.string() })
    .optional(),
  email: z.string().email().optional(),
});

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;

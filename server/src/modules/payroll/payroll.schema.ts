import { z } from 'zod';

export const createPayrollSchema = z.object({
  employeeId: z.string().min(1),
  payPeriod: z.string().min(1),
  base: z.number().min(0),
  bonuses: z.number().min(0).default(0),
  deductions: z.number().min(0).default(0),
  netPay: z.number().min(0),
  currency: z.string().default('USD'),
});

export type CreatePayrollInput = z.infer<typeof createPayrollSchema>;

import { z } from 'zod';

export const createBudgetSchema = z
  .object({
    category_id: z.string().uuid('Please select a category'),
    amount: z.number().positive('Budget amount must be greater than 0'),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid start date format (YYYY-MM-DD)'),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid end date format (YYYY-MM-DD)'),
    month: z.number().int().min(1).max(12).optional(),
    year: z.number().int().min(2020).max(2100).optional(),
  })
  .refine((data) => new Date(data.endDate) >= new Date(data.startDate), {
    message: 'End date must be on or after start date',
    path: ['endDate'],
  });

export type CreateBudgetInput = z.infer<typeof createBudgetSchema>;

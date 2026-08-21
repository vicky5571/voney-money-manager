import { z } from 'zod';

export const createBudgetSchema = z.object({
  category_id: z.string().uuid('Please select a category'),
  amount: z.number().positive('Budget amount must be greater than 0'),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2020).max(2100),
});

export type CreateBudgetInput = z.infer<typeof createBudgetSchema>;

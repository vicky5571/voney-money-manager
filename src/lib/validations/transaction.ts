import { z } from 'zod';

export const createTransactionSchema = z.object({
  type: z.enum(['income', 'expense']),
  amount: z.number().positive('Amount must be greater than 0'),
  category_id: z.string().uuid('Please select a category'),
  account_id: z.string().uuid('Please select an account'),
  transaction_date: z.string().min(1, 'Please select a date'),
  note: z.string().max(200, 'Note must be 200 characters or less').optional(),
});

export const updateTransactionSchema = createTransactionSchema;

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;

import { z } from 'zod';

export const recurringBillSchema = z.object({
  name: z
    .string()
    .min(1, 'Bill name is required')
    .max(100, 'Bill name must be 100 characters or less'),
  amount: z
    .number()
    .positive('Amount must be greater than 0')
    .max(1e12, 'Amount is too large'),
  account_id: z.string().uuid('Please select a valid account'),
  category_id: z.string().uuid('Please select a valid category'),
  frequency: z.enum(['monthly', 'weekly', 'yearly'], {
    message: 'Frequency must be weekly, monthly, or yearly',
  }),
  due_day: z
    .number()
    .int('Due day must be an integer')
    .min(1, 'Due day must be at least 1')
    .max(31, 'Due day must be at most 31'),
  next_due_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Next due date must be in YYYY-MM-DD format'),
  note: z
    .string()
    .max(200, 'Note must be 200 characters or less')
    .optional()
    .nullable(),
});

export const createRecurringBillSchema = recurringBillSchema;

export const updateRecurringBillSchema = recurringBillSchema.extend({
  is_active: z.boolean().optional(),
});

export type RecurringBillInput = z.infer<typeof recurringBillSchema>;
export type CreateRecurringBillInput = z.infer<typeof createRecurringBillSchema>;
export type UpdateRecurringBillInput = z.infer<typeof updateRecurringBillSchema>;

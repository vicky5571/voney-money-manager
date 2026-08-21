import { z } from 'zod';

export const createAccountSchema = z.object({
  name: z.string().min(1, 'Account name is required').max(50),
  type: z.enum(['cash', 'bank', 'e-wallet']),
  icon: z.string().optional(),
});

export const updateAccountSchema = createAccountSchema;

export type CreateAccountInput = z.infer<typeof createAccountSchema>;

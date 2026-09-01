'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import {
  createRecurringBillSchema,
  updateRecurringBillSchema,
  type CreateRecurringBillInput,
  type UpdateRecurringBillInput,
} from '@/lib/validations/recurring';

export interface RecurringBillData {
  id: string;
  name: string;
  amount: number;
  frequency: 'monthly' | 'weekly' | 'yearly';
  due_day: number;
  next_due_date: string;
  last_paid_date: string | null;
  is_active: boolean;
  note: string | null;
  accounts: { id: string; name: string } | null;
  categories: { id: string; name: string; icon: string; color: string } | null;
}

/** Verify account belongs to user (IDOR prevention) */
async function assertAccountOwnership(
  supabase: Awaited<ReturnType<typeof createClient>>,
  accountId: string,
  userId: string,
) {
  const { data, error } = await supabase
    .from('accounts')
    .select('id')
    .eq('id', accountId)
    .eq('user_id', userId)
    .single();
  if (error || !data) throw new Error('Account not found or access denied');
}

/** Verify category is default or owned by user */
async function assertCategoryOwnership(
  supabase: Awaited<ReturnType<typeof createClient>>,
  categoryId: string,
  userId: string,
) {
  const { data, error } = await supabase
    .from('categories')
    .select('id, user_id, is_default')
    .eq('id', categoryId)
    .single();
  if (error || !data) throw new Error('Category not found');
  const row = data as unknown as {
    user_id: string | null;
    is_default: boolean;
  };
  if (row.user_id !== null && row.user_id !== userId && !row.is_default) {
    throw new Error('Category not found or access denied');
  }
}

export async function getRecurringBills(): Promise<RecurringBillData[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('recurring_bills')
    .select(`
      id,
      name,
      amount,
      frequency,
      due_day,
      next_due_date,
      last_paid_date,
      is_active,
      note,
      accounts:accounts!account_id ( id, name ),
      categories:categories!category_id ( id, name, icon, color )
    `)
    .eq('user_id', user.id)
    .order('next_due_date', { ascending: true });

  if (error) {
    console.warn('Error fetching recurring bills:', error.message);
    return [];
  }

  return (data ?? []).map((bill) => ({
    ...bill,
    amount: Number(bill.amount),
    accounts: Array.isArray(bill.accounts) ? bill.accounts[0] ?? null : bill.accounts,
    categories: Array.isArray(bill.categories) ? bill.categories[0] ?? null : bill.categories,
  }));
}

export async function createRecurringBill(formData: CreateRecurringBillInput) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const parsed = createRecurringBillSchema.safeParse(formData);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message || 'Invalid recurring bill input');
  }
  const valid = parsed.data;

  // IDOR prevention: assert ownership of account and category
  await assertAccountOwnership(supabase, valid.account_id, user.id);
  await assertCategoryOwnership(supabase, valid.category_id, user.id);

  const { error } = await supabase.from('recurring_bills').insert({
    user_id: user.id,
    name: valid.name.trim(),
    amount: valid.amount,
    account_id: valid.account_id,
    category_id: valid.category_id,
    frequency: valid.frequency,
    due_day: valid.due_day,
    next_due_date: valid.next_due_date,
    is_active: true,
    note: valid.note || null,
  });

  if (error) throw error;

  revalidatePath('/');
  revalidatePath('/recurring');
}

export async function updateRecurringBill(
  id: string,
  formData: UpdateRecurringBillInput
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const parsed = updateRecurringBillSchema.safeParse(formData);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message || 'Invalid recurring bill input');
  }
  const valid = parsed.data;

  // IDOR prevention: assert ownership of account and category
  await assertAccountOwnership(supabase, valid.account_id, user.id);
  await assertCategoryOwnership(supabase, valid.category_id, user.id);

  const { error } = await supabase
    .from('recurring_bills')
    .update({
      name: valid.name.trim(),
      amount: valid.amount,
      account_id: valid.account_id,
      category_id: valid.category_id,
      frequency: valid.frequency,
      due_day: valid.due_day,
      next_due_date: valid.next_due_date,
      is_active: valid.is_active ?? true,
      note: valid.note || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) throw error;

  revalidatePath('/');
  revalidatePath('/recurring');
}

export async function deleteRecurringBill(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('recurring_bills')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) throw error;

  revalidatePath('/');
  revalidatePath('/recurring');
}

/**
 * Marks a recurring bill as paid:
 * 1. Creates actual transaction entry in `transactions`
 * 2. Deducts amount from account balance
 * 3. Updates `last_paid_date` to today
 * 4. Advances `next_due_date` according to frequency
 */
export async function payRecurringBill(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: bill, error: fetchErr } = await supabase
    .from('recurring_bills')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (fetchErr || !bill) throw new Error('Recurring bill not found');

  // Verify account still exists and belongs to user
  await assertAccountOwnership(supabase, bill.account_id, user.id);
  await assertCategoryOwnership(supabase, bill.category_id, user.id);

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  // 1. Create transaction in transactions table
  await supabase.from('transactions').insert({
    user_id: user.id,
    account_id: bill.account_id,
    category_id: bill.category_id,
    type: 'expense',
    amount: bill.amount,
    transaction_date: todayStr,
    note: `Bill Paid: ${bill.name}${bill.note ? ` - ${bill.note}` : ''}`,
  });

  // 2. Update account balance
  const { data: account } = await supabase
    .from('accounts')
    .select('balance')
    .eq('id', bill.account_id)
    .eq('user_id', user.id)
    .single();

  if (account) {
    const newBalance = Number(account.balance) - Number(bill.amount);
    await supabase
      .from('accounts')
      .update({ balance: newBalance })
      .eq('id', bill.account_id)
      .eq('user_id', user.id);
  }

  // 3. Compute next due date based on frequency
  const currentDueDate = new Date(bill.next_due_date + 'T00:00:00');
  const nextDueDate = new Date(currentDueDate);

  if (bill.frequency === 'weekly') {
    nextDueDate.setDate(nextDueDate.getDate() + 7);
  } else if (bill.frequency === 'yearly') {
    nextDueDate.setFullYear(nextDueDate.getFullYear() + 1);
  } else {
    // Monthly (default)
    nextDueDate.setMonth(nextDueDate.getMonth() + 1);
  }

  const nextDueStr = `${nextDueDate.getFullYear()}-${String(nextDueDate.getMonth() + 1).padStart(2, '0')}-${String(nextDueDate.getDate()).padStart(2, '0')}`;

  // 4. Update bill
  await supabase
    .from('recurring_bills')
    .update({
      last_paid_date: todayStr,
      next_due_date: nextDueStr,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', user.id);

  revalidatePath('/');
  revalidatePath('/transactions');
  revalidatePath('/accounts');
  revalidatePath('/recurring');
}

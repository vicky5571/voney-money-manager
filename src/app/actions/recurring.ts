'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

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
      accounts ( id, name ),
      categories ( id, name, icon, color )
    `)
    .eq('user_id', user.id)
    .order('next_due_date', { ascending: true });

  if (error) {
    // If table doesn't exist yet, return empty list gracefully
    console.error('Error fetching recurring bills:', error);
    return [];
  }

  return (data ?? []).map((bill) => ({
    ...bill,
    amount: Number(bill.amount),
    accounts: Array.isArray(bill.accounts) ? bill.accounts[0] ?? null : bill.accounts,
    categories: Array.isArray(bill.categories) ? bill.categories[0] ?? null : bill.categories,
  }));
}

export async function createRecurringBill(formData: {
  name: string;
  amount: number;
  account_id: string;
  category_id: string;
  frequency: 'monthly' | 'weekly' | 'yearly';
  due_day: number;
  next_due_date: string;
  note?: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase.from('recurring_bills').insert({
    user_id: user.id,
    name: formData.name.trim(),
    amount: formData.amount,
    account_id: formData.account_id,
    category_id: formData.category_id,
    frequency: formData.frequency,
    due_day: formData.due_day,
    next_due_date: formData.next_due_date,
    is_active: true,
    note: formData.note || null,
  });

  if (error) throw error;

  revalidatePath('/');
  revalidatePath('/recurring');
}

export async function updateRecurringBill(
  id: string,
  formData: {
    name: string;
    amount: number;
    account_id: string;
    category_id: string;
    frequency: 'monthly' | 'weekly' | 'yearly';
    due_day: number;
    next_due_date: string;
    is_active: boolean;
    note?: string;
  }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('recurring_bills')
    .update({
      name: formData.name.trim(),
      amount: formData.amount,
      account_id: formData.account_id,
      category_id: formData.category_id,
      frequency: formData.frequency,
      due_day: formData.due_day,
      next_due_date: formData.next_due_date,
      is_active: formData.is_active,
      note: formData.note || null,
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
    .single();

  if (account) {
    const newBalance = Number(account.balance) - Number(bill.amount);
    await supabase.from('accounts').update({ balance: newBalance }).eq('id', bill.account_id);
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
    .eq('id', id);

  revalidatePath('/');
  revalidatePath('/transactions');
  revalidatePath('/accounts');
  revalidatePath('/recurring');
}

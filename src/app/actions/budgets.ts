'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

interface BudgetCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export interface BudgetQueryResult {
  id: string;
  amount: number;
  startDate: string;
  endDate: string;
  month?: number | null;
  year?: number | null;
  category: BudgetCategory | null;
  spent: number;
}

export async function getBudgets(month?: number, year?: number): Promise<BudgetQueryResult[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const now = new Date();
  const targetMonth = month ?? now.getMonth() + 1;
  const targetYear = year ?? now.getFullYear();

  const firstOfMonth = `${targetYear}-${String(targetMonth).padStart(2, '0')}-01`;
  const lastOfMonth = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${new Date(targetYear, targetMonth, 0).getDate()}`;

  // Fetch budgets that overlap with the selected month or range
  const { data: budgets, error: budgetsError } = await supabase
    .from('budgets')
    .select(`
      id, amount, start_date, end_date, month, year,
      categories ( id, name, icon, color )
    `)
    .eq('user_id', user.id)
    .lte('start_date', lastOfMonth)
    .gte('end_date', firstOfMonth)
    .order('start_date', { ascending: true });

  if (budgetsError) throw budgetsError;
  if (!budgets || budgets.length === 0) return [];

  // Find the earliest start_date and latest end_date among these budgets
  const minStartDate = budgets.reduce((min, b) => (b.start_date < min ? b.start_date : min), budgets[0].start_date);
  const maxEndDate = budgets.reduce((max, b) => (b.end_date > max ? b.end_date : max), budgets[0].end_date);

  // Fetch all expense transactions in the bounding date range
  const { data: transactions, error: txError } = await supabase
    .from('transactions')
    .select('category_id, amount, transaction_date')
    .eq('user_id', user.id)
    .eq('type', 'expense')
    .gte('transaction_date', minStartDate)
    .lte('transaction_date', maxEndDate);

  if (txError) throw txError;

  const txList = transactions ?? [];

  return budgets.map((b) => {
    const category = (Array.isArray(b.categories) ? b.categories[0] : b.categories) as BudgetCategory | null;
    const catId = category?.id ?? '';

    // Sum transactions matching this budget's category and date interval
    const spent = txList
      .filter((t) => t.category_id === catId && t.transaction_date >= b.start_date && t.transaction_date <= b.end_date)
      .reduce((sum, t) => sum + Number(t.amount), 0);

    return {
      id: b.id,
      amount: Number(b.amount),
      startDate: b.start_date,
      endDate: b.end_date,
      month: b.month,
      year: b.year,
      category,
      spent,
    };
  });
}

export async function createBudget(formData: {
  category_id: string;
  amount: number;
  startDate: string;
  endDate: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  if (new Date(formData.endDate) < new Date(formData.startDate)) {
    throw new Error('End date must be on or after start date');
  }

  const startD = new Date(formData.startDate);
  const month = startD.getMonth() + 1;
  const year = startD.getFullYear();

  const { error } = await supabase.from('budgets').insert({
    user_id: user.id,
    category_id: formData.category_id,
    amount: formData.amount,
    start_date: formData.startDate,
    end_date: formData.endDate,
    month,
    year,
  });

  if (error) throw error;
  revalidatePath('/budgets');
  revalidatePath('/');
}

export async function updateBudget(id: string, formData: {
  category_id: string;
  amount: number;
  startDate: string;
  endDate: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  if (new Date(formData.endDate) < new Date(formData.startDate)) {
    throw new Error('End date must be on or after start date');
  }

  const startD = new Date(formData.startDate);
  const month = startD.getMonth() + 1;
  const year = startD.getFullYear();

  const { error } = await supabase
    .from('budgets')
    .update({
      category_id: formData.category_id,
      amount: formData.amount,
      start_date: formData.startDate,
      end_date: formData.endDate,
      month,
      year,
    })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) throw error;
  revalidatePath('/budgets');
  revalidatePath('/');
}

export async function deleteBudget(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('budgets')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) throw error;
  revalidatePath('/budgets');
  revalidatePath('/');
}

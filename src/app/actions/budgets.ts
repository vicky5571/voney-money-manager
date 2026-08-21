'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function getBudgets(month: number, year: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Get budgets for the month
  const { data: budgets } = await supabase
    .from('budgets')
    .select(`
      id, amount, month, year,
      categories ( id, name, icon, color )
    `)
    .eq('user_id', user.id)
    .eq('month', month)
    .eq('year', year);

  // Get spent amounts for each budget category
  const firstOfMonth = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastOfMonth = `${year}-${String(month).padStart(2, '0')}-${new Date(year, month, 0).getDate()}`;

  const { data: transactions } = await supabase
    .from('transactions')
    .select('category_id, amount')
    .eq('user_id', user.id)
    .eq('type', 'expense')
    .gte('transaction_date', firstOfMonth)
    .lte('transaction_date', lastOfMonth);

  // Calculate spent per category
  const spentByCategory: Record<string, number> = {};
  transactions?.forEach(t => {
    spentByCategory[t.category_id] = (spentByCategory[t.category_id] || 0) + Number(t.amount);
  });

  return (budgets ?? []).map(b => ({
    id: b.id,
    amount: Number(b.amount),
    month: b.month,
    year: b.year,
    category: b.categories,
    spent: spentByCategory[(b.categories as any)?.id] || 0,
  }));
}

export async function createBudget(formData: {
  category_id: string;
  amount: number;
  month: number;
  year: number;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Check for duplicate
  const { data: existing } = await supabase
    .from('budgets')
    .select('id')
    .eq('user_id', user.id)
    .eq('category_id', formData.category_id)
    .eq('month', formData.month)
    .eq('year', formData.year);

  if (existing && existing.length > 0) {
    throw new Error('Budget already exists for this category this month');
  }

  const { error } = await supabase.from('budgets').insert({
    user_id: user.id,
    category_id: formData.category_id,
    amount: formData.amount,
    month: formData.month,
    year: formData.year,
  });

  if (error) throw error;
  revalidatePath('/budgets');
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
}

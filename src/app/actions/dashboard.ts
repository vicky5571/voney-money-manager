'use server';

import { createClient } from '@/lib/supabase/server';

export async function getDashboardData() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) throw new Error('Not authenticated');

  // Get all accounts for total balance
  const { data: accounts } = await supabase
    .from('accounts')
    .select('balance')
    .eq('user_id', user.id);

  const totalBalance = accounts?.reduce((sum, acc) => sum + Number(acc.balance), 0) ?? 0;

  // Get current month transactions for income/expense summary
  const now = new Date();
  const firstOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const lastOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()}`;

  const { data: monthlyTransactions } = await supabase
    .from('transactions')
    .select('type, amount')
    .eq('user_id', user.id)
    .gte('transaction_date', firstOfMonth)
    .lte('transaction_date', lastOfMonth);

  const income = monthlyTransactions
    ?.filter(t => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount), 0) ?? 0;

  const expense = monthlyTransactions
    ?.filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount), 0) ?? 0;

  // Get recent 5 transactions with category info
  const { data: recentTransactions } = await supabase
    .from('transactions')
    .select(`
      id,
      type,
      amount,
      note,
      transaction_date,
      categories ( name, icon, color ),
      accounts ( name )
    `)
    .eq('user_id', user.id)
    .order('transaction_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(5);

  return {
    totalBalance,
    income,
    expense,
    recentTransactions: recentTransactions ?? [],
  };
}

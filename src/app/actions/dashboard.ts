'use server';

import { createClient } from '@/lib/supabase/server';

export async function getDashboardData() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) throw new Error('Not authenticated');

  // Get all accounts for total balance and wallet preview
  const { data: accounts } = await supabase
    .from('accounts')
    .select('id, name, type, icon, balance')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true });

  const totalBalance = accounts?.reduce((sum, acc) => sum + Number(acc.balance), 0) ?? 0;

  // Get current month transactions for income/expense summary
  const now = new Date();
  const firstOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const lastOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()}`;

  const { data: monthlyTransactions } = await supabase
    .from('transactions')
    .select('type, amount, category_id, transaction_date')
    .eq('user_id', user.id)
    .gte('transaction_date', firstOfMonth)
    .lte('transaction_date', lastOfMonth);

  const trendStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
  const trendStartDate = `${trendStart.getFullYear()}-${String(trendStart.getMonth() + 1).padStart(2, '0')}-${String(trendStart.getDate()).padStart(2, '0')}`;
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const { data: trendTransactions } = await supabase
    .from('transactions')
    .select('amount, transaction_date')
    .eq('user_id', user.id)
    .eq('type', 'expense')
    .gte('transaction_date', trendStartDate)
    .lte('transaction_date', today);

  const spendingByDate = (trendTransactions ?? []).reduce<Record<string, number>>((totals, transaction) => {
    totals[transaction.transaction_date] = (totals[transaction.transaction_date] ?? 0) + Number(transaction.amount);
    return totals;
  }, {});
  const spendingTrend = Array.from({ length: 30 }, (_, index) => {
    const date = new Date(trendStart);
    date.setDate(trendStart.getDate() + index);
    const rawDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return {
      date: rawDate,
      label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      amount: spendingByDate[rawDate] ?? 0,
    };
  });

  const income = monthlyTransactions
    ?.filter(t => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount), 0) ?? 0;

  const expense = monthlyTransactions
    ?.filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount), 0) ?? 0;

  // Get active budgets for this month
  const { data: budgets } = await supabase
    .from('budgets')
    .select('id, amount, category_id, start_date, end_date')
    .eq('user_id', user.id)
    .lte('start_date', lastOfMonth)
    .gte('end_date', firstOfMonth);

  let totalBudget = 0;
  let totalBudgetSpent = 0;

  if (budgets && budgets.length > 0) {
    totalBudget = budgets.reduce((sum, b) => sum + Number(b.amount), 0);
    
    // Calculate spent for these budgets
    budgets.forEach((b) => {
      const bStart = b.start_date;
      const bEnd = b.end_date;
      const spentForBudget = monthlyTransactions
        ?.filter(
          (t) =>
            t.type === 'expense' &&
            t.category_id === b.category_id &&
            t.transaction_date >= bStart &&
            t.transaction_date <= bEnd
        )
        .reduce((sum, t) => sum + Number(t.amount), 0) ?? 0;
      totalBudgetSpent += spentForBudget;
    });
  }

  // Get recent 5 transactions with category info
  const { data: recentTransactions } = await supabase
    .from('transactions')
    .select(`
      id,
      type,
      amount,
      note,
      transaction_date,
      categories ( id, name, icon, color ),
      accounts ( id, name )
    `)
    .eq('user_id', user.id)
    .order('transaction_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(5);

  return {
    totalBalance,
    income,
    expense,
    accounts: accounts ?? [],
    totalBudget,
    totalBudgetSpent,
    spendingTrend,
    recentTransactions: recentTransactions ?? [],
  };
}

import { getDashboardData } from '@/app/actions/dashboard';
import { getGreeting } from '@/lib/utils';
import { createClient } from '@/lib/supabase/server';
import { DashboardClient } from '@/components/dashboard-client';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  const displayName = user?.user_metadata?.display_name || 'User';
  const greeting = getGreeting();
  const data = await getDashboardData();

  const recentTransactions = (data.recentTransactions as unknown as Array<{
    id: string;
    type: 'income' | 'expense';
    amount: number;
    note: string | null;
    transaction_date: string;
    categories: { id?: string; name: string; icon: string; color: string } | null;
    accounts: { id?: string; name: string } | null;
  }>).map((tx) => ({
    ...tx,
    categories: Array.isArray(tx.categories) ? tx.categories[0] ?? null : tx.categories,
    accounts: Array.isArray(tx.accounts) ? tx.accounts[0] ?? null : tx.accounts,
  }));

  return (
    <DashboardClient
      displayName={displayName}
      greeting={greeting}
      totalBalance={data.totalBalance}
      income={data.income}
      expense={data.expense}
      accounts={data.accounts}
      budgetSummary={{
        totalBudget: data.totalBudget,
        totalBudgetSpent: data.totalBudgetSpent,
      }}
      recentTransactions={recentTransactions}
    />
  );
}


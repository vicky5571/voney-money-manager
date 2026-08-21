import { getDashboardData } from '@/app/actions/dashboard';
import { getGreeting } from '@/lib/utils';
import { createClient } from '@/lib/supabase/server';
import { Bell } from 'lucide-react';
import { BalanceCard } from '@/components/balance-card';
import { TransactionItem } from '@/components/transaction-item';
import Link from 'next/link';

interface RecentTxItem {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  note: string | null;
  transaction_date: string;
  categories: { name: string; icon: string; color: string } | null;
  accounts: { name: string } | null;
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  const displayName = user?.user_metadata?.display_name || 'User';
  const greeting = getGreeting();
  const data = await getDashboardData();
  
  const recentTransactions = (data.recentTransactions as unknown as RecentTxItem[]).map((tx) => ({
    ...tx,
    categories: Array.isArray(tx.categories) ? tx.categories[0] ?? null : tx.categories,
    accounts: Array.isArray(tx.accounts) ? tx.accounts[0] ?? null : tx.accounts,
  }));

  return (
    <div className="flex flex-col gap-6 px-4 pt-6 pb-24 max-w-md mx-auto">
      {/* Top greeting row */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{greeting}, {displayName}</h1>
        </div>
        <button className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center shrink-0" aria-label="Notifications">
          <Bell size={20} className="text-gray-600" />
        </button>
      </div>

      {/* Balance Card */}
      <div>
        <BalanceCard 
          totalBalance={data.totalBalance} 
          income={data.income} 
          expense={data.expense} 
        />
      </div>

      {/* Recent Transactions */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between mt-2">
          <h2 className="text-lg font-bold text-gray-900">Recent transactions</h2>
          <Link href="/transactions" className="text-sm font-medium text-indigo-600">
            See all
          </Link>
        </div>

        <div className="flex flex-col gap-1">
          {recentTransactions.length > 0 ? (
            recentTransactions.map((tx) => (
              <TransactionItem
                key={tx.id}
                id={tx.id}
                categoryName={tx.categories?.name || 'Unknown'}
                categoryIcon={tx.categories?.icon || 'help-circle'}
                categoryColor={tx.categories?.color || '#94a3b8'}
                note={tx.note}
                amount={Number(tx.amount)}
                type={tx.type}
                date={tx.transaction_date}
              />
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-10 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
              <p className="text-gray-500 mb-4">No transactions yet</p>
              <Link href="/add" className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium">
                Add Transaction
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { getDashboardData } from '@/app/actions/dashboard';
import { getGreeting } from '@/lib/utils';
import { createClient } from '@/lib/supabase/server';
import { Bell } from 'lucide-react';
import { BalanceCard } from '@/components/balance-card';
import { TransactionItem } from '@/components/transaction-item';
import Link from 'next/link';
import { AnimatedPage } from '@/components/animated-page';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  // Use display_name from metadata, fallback to 'User'
  const displayName = user?.user_metadata?.display_name || 'User';

  const data = await getDashboardData();
  const greeting = getGreeting();

  return (
    <AnimatedPage>
      <div className="flex flex-col gap-6 px-4 pt-6 pb-24 max-w-md mx-auto">
        {/* Top section */}
        <div data-animate className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{greeting}, {displayName}</h1>
          </div>
          <button className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center shrink-0">
            <Bell size={20} className="text-gray-600" />
          </button>
        </div>

        {/* Balance Card */}
        <div data-animate>
          <BalanceCard 
            totalBalance={data.totalBalance} 
            income={data.income} 
            expense={data.expense} 
          />
        </div>

        {/* Recent Transactions */}
        <div className="flex flex-col gap-3">
          <div data-animate className="flex items-center justify-between mt-2">
            <h2 className="text-lg font-bold text-gray-900">Recent transactions</h2>
            <Link href="/transactions" className="text-sm font-medium text-indigo-600">
              See all
            </Link>
          </div>

          <div data-animate className="flex flex-col gap-1">
            {data.recentTransactions.length > 0 ? (
              data.recentTransactions.map((tx: any) => (
                <TransactionItem
                  key={tx.id}
                  id={tx.id}
                  categoryName={tx.categories?.name || 'Unknown'}
                  categoryIcon={tx.categories?.icon || 'help-circle'}
                  categoryColor={tx.categories?.color || '#94a3b8'}
                  note={tx.note}
                  amount={tx.amount}
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
    </AnimatedPage>
  );
}

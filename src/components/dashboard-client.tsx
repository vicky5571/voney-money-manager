'use client';

import { useState } from 'react';
import Link from 'next/link';
import { formatCurrency } from '@/lib/utils';
import { BalanceCard } from '@/components/balance-card';
import { DashboardOnboarding } from '@/components/dashboard-onboarding';
import { SpendingTrendChart, type SpendingTrendPoint } from '@/components/spending-trend-chart';
import { TransactionItem } from '@/components/transaction-item';
import { TransactionDetailSheet } from '@/components/transaction-detail-sheet';
import { Wallet, Building2, Smartphone, ChevronRight, PieChart, Plus, Bell } from 'lucide-react';

interface AccountItem {
  id: string;
  name: string;
  type: 'cash' | 'bank' | 'e-wallet';
  balance: number;
  icon?: string;
}

interface RecentTxItem {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  note: string | null;
  transaction_date: string;
  categories: { id?: string; name: string; icon: string; color: string } | null;
  accounts: { id?: string; name: string } | null;
}

interface BudgetSummary {
  totalBudget: number;
  totalBudgetSpent: number;
}

interface DashboardClientProps {
  displayName: string;
  greeting: string;
  totalBalance: number;
  income: number;
  expense: number;
  accounts: AccountItem[];
  budgetSummary: BudgetSummary;
  recentTransactions: RecentTxItem[];
  spendingTrend: SpendingTrendPoint[];
}

export function DashboardClient({
  displayName,
  greeting,
  totalBalance,
  income,
  expense,
  accounts,
  budgetSummary,
  recentTransactions,
  spendingTrend,
}: DashboardClientProps) {
  const [selectedTx, setSelectedTx] = useState<RecentTxItem | null>(null);

  const getAccountIcon = (type: string) => {
    switch (type) {
      case 'bank':
        return { Icon: Building2, bg: 'bg-blue-50 text-blue-600' };
      case 'e-wallet':
        return { Icon: Smartphone, bg: 'bg-purple-50 text-purple-600' };
      default:
        return { Icon: Wallet, bg: 'bg-emerald-50 text-emerald-600' };
    }
  };

  // Budget Health Calculation
  const { totalBudget, totalBudgetSpent } = budgetSummary;
  const budgetPercent = totalBudget > 0 ? Math.min(100, Math.round((totalBudgetSpent / totalBudget) * 100)) : 0;
  const budgetRemaining = Math.max(0, totalBudget - totalBudgetSpent);
  const isOverBudget = totalBudgetSpent > totalBudget && totalBudget > 0;

  let progressColor = 'bg-emerald-500';
  if (isOverBudget || budgetPercent >= 90) {
    progressColor = 'bg-red-500';
  } else if (budgetPercent >= 75) {
    progressColor = 'bg-amber-500';
  }

  return (
    <div className="flex flex-col gap-6 px-4 pt-6 pb-24 max-w-md mx-auto">
      {/* Top greeting row */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{greeting}, {displayName}</h1>
          <p className="text-xs text-gray-400 mt-0.5">Welcome back to Voney</p>
        </div>
        <button className="w-10 h-10 rounded-full bg-white shadow-sm border border-gray-100 flex items-center justify-center shrink-0 hover:bg-gray-50 transition-colors" aria-label="Notifications">
          <Bell size={18} className="text-gray-600" />
        </button>
      </div>

      {/* Balance Card with Hide/Show Toggle */}
      <div>
        <BalanceCard
          totalBalance={totalBalance}
          income={income}
          expense={expense}
        />
      </div>

      <DashboardOnboarding
        hasAccount={accounts.length > 0}
        hasTransaction={recentTransactions.length > 0}
        hasBudget={totalBudget > 0}
      />

      {/* Budget Health Bar */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <PieChart size={15} />
            </div>
            <div>
              <h2 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Monthly Budget</h2>
            </div>
          </div>
          <Link href="/budgets" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-0.5">
            Details <ChevronRight size={14} />
          </Link>
        </div>

        {totalBudget > 0 ? (
          <div className="space-y-2 mt-3">
            <div className="flex items-baseline justify-between text-xs">
              <span className="font-semibold text-gray-700">
                {formatCurrency(totalBudgetSpent)} <span className="text-gray-400 font-normal">spent</span>
              </span>
              <span className={`font-bold ${isOverBudget ? 'text-red-600' : 'text-gray-500'}`}>
                {isOverBudget ? 'Over Budget!' : `${formatCurrency(budgetRemaining)} left`}
              </span>
            </div>

            {/* Progress Track */}
            <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${progressColor}`}
                style={{ width: `${budgetPercent}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-gray-400 pt-0.5">
              <span>{budgetPercent}% used</span>
              <span>Limit: {formatCurrency(totalBudget)}</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between py-2 text-xs text-gray-500">
            <span>No active budgets this month</span>
            <Link href="/budgets" className="px-2.5 py-1 bg-indigo-50 text-indigo-600 rounded-lg font-semibold text-xs hover:bg-indigo-100 transition-colors">
              Set Budget
            </Link>
          </div>
        )}
      </div>

      {recentTransactions.length > 0 && <SpendingTrendChart data={spendingTrend} />}

      {/* Wallets Preview */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900">Your Wallets</h2>
          <Link href="/accounts" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-0.5">
            See all ({accounts.length}) <ChevronRight size={14} />
          </Link>
        </div>

        {accounts.length > 0 ? (
          <div className="grid grid-cols-2 gap-2.5">
            {accounts.slice(0, 4).map((acc) => {
              const { Icon, bg } = getAccountIcon(acc.type);
              return (
                <Link
                  key={acc.id}
                  href="/accounts"
                  className="bg-white rounded-2xl p-3 border border-gray-100 shadow-sm flex flex-col justify-between gap-2 hover:shadow-md active:scale-[0.98] transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${bg}`}>
                      <Icon size={16} />
                    </div>
                    <span className="text-[10px] uppercase font-semibold text-gray-400 tracking-wider">
                      {acc.type}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-600 truncate">{acc.name}</p>
                    <p className="text-sm font-bold text-gray-900 mt-0.5">{formatCurrency(acc.balance)}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="bg-gray-50 rounded-2xl p-4 text-center border border-dashed border-gray-200">
            <p className="text-xs text-gray-500 mb-2">No wallets created yet</p>
            <Link href="/accounts" className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600">
              <Plus size={14} /> Add Wallet
            </Link>
          </div>
        )}
      </div>

      {/* Recent Transactions (Tappable) */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between mt-1">
          <h2 className="text-base font-bold text-gray-900">Recent Transactions</h2>
          <Link href="/transactions" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700">
            See all
          </Link>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50 shadow-sm">
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
                onClick={() => setSelectedTx(tx)}
              />
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center px-4">
              <p className="text-xs text-gray-400 mb-3">No transactions yet</p>
              <Link href="/add" className="px-3.5 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 transition-colors">
                Add First Transaction
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Transaction Detail Sheet */}
      {selectedTx && (
        <TransactionDetailSheet
          isOpen={!!selectedTx}
          onClose={() => setSelectedTx(null)}
          transaction={{
            id: selectedTx.id,
            type: selectedTx.type,
            amount: selectedTx.amount,
            note: selectedTx.note,
            transaction_date: selectedTx.transaction_date,
            categories: selectedTx.categories
              ? { name: selectedTx.categories.name, icon: selectedTx.categories.icon, color: selectedTx.categories.color }
              : null,
            accounts: selectedTx.accounts ? { name: selectedTx.accounts.name } : null,
          }}
        />
      )}
    </div>
  );
}

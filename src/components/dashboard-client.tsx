'use client';

import { useState } from 'react';
import Link from 'next/link';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { BalanceCard } from '@/components/balance-card';
import { DashboardOnboarding } from '@/components/dashboard-onboarding';
import { SpendingTrendChart, type SpendingTrendPoint } from '@/components/spending-trend-chart';
import { TransactionItem } from '@/components/transaction-item';
import { TransactionDetailSheet } from '@/components/transaction-detail-sheet';
import { CategoryBreakdownChart, type CategorySpendingItem, type MonthOverMonthComparison } from '@/components/category-breakdown-chart';
import { FinancialHealthCard } from '@/components/financial-health-card';
import type { FinancialHealthResult } from '@/lib/financial-health';
import { CategoryIcon } from '@/constants/categories';
import type { CategoryBudgetStatus, SpendingInsight } from '@/app/actions/dashboard';
import {
  Wallet,
  Building2,
  Smartphone,
  ChevronRight,
  PieChart,
  Plus,
  Bell,
  AlertTriangle,
  TrendingUp,
  X,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

interface AccountItem {
  id: string;
  name: string;
  type: 'cash' | 'bank' | 'e-wallet';
  balance: number;
  icon?: string;
}

interface UpcomingBillItem {
  id: string;
  name: string;
  amount: number;
  frequency: string;
  next_due_date: string;
  categories: { id?: string; name: string; icon: string; color: string } | null;
  accounts: { id?: string; name: string } | null;
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
  categoryBudgets?: CategoryBudgetStatus[];
  spendingInsight?: SpendingInsight | null;
  categorySpendingBreakdown?: CategorySpendingItem[];
  momComparison?: MonthOverMonthComparison | null;
  upcomingBills?: UpcomingBillItem[];
  financialHealth?: FinancialHealthResult;
  recentTransactions: RecentTxItem[];
  spendingTrend: SpendingTrendPoint[];
}

function formatTxDateGroup(dateStr: string): string {
  const today = new Date();
  const txDate = new Date(dateStr + 'T00:00:00');

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

  if (dateStr === todayStr) return 'Today';
  if (dateStr === yesterdayStr) return 'Yesterday';
  return txDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function DashboardClient({
  displayName,
  greeting,
  totalBalance,
  income,
  expense,
  accounts,
  budgetSummary,
  categoryBudgets = [],
  spendingInsight = null,
  categorySpendingBreakdown = [],
  momComparison = null,
  upcomingBills = [],
  financialHealth,
  recentTransactions,
  spendingTrend,
}: DashboardClientProps) {
  const [selectedTx, setSelectedTx] = useState<RecentTxItem | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);

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

  // Category-level alerts
  const overBudgets = categoryBudgets.filter((b) => b.isOver);
  const nearBudgets = categoryBudgets.filter((b) => b.isNear);
  const totalAlerts = overBudgets.length + nearBudgets.length + (spendingInsight?.type === 'warning' ? 1 : 0);

  // Group recent transactions by date
  const groupedTransactions = recentTransactions.reduce<Record<string, RecentTxItem[]>>((acc, tx) => {
    const key = formatTxDateGroup(tx.transaction_date);
    if (!acc[key]) acc[key] = [];
    acc[key].push(tx);
    return acc;
  }, {});

  return (
    <div className="flex flex-col gap-6 px-4 pt-6 pb-24 max-w-md mx-auto">
      {/* Top greeting row */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{greeting}, {displayName}</h1>
          <p className="text-xs text-gray-500 mt-0.5 font-medium">Welcome back to Voney</p>
        </div>
        
        {/* Notification Bell (44px min tap target) */}
        <button
          type="button"
          onClick={() => setShowNotifications(true)}
          className="relative min-w-[44px] min-h-[44px] w-11 h-11 rounded-full bg-white shadow-sm border border-gray-100 flex items-center justify-center shrink-0 hover:bg-gray-50 active:scale-95 transition-all"
          aria-label={`Notifications ${totalAlerts > 0 ? `(${totalAlerts} active alerts)` : ''}`}
        >
          <Bell size={18} className="text-gray-700" />
          {totalAlerts > 0 && (
            <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-white" />
          )}
        </button>
      </div>

      {/* Balance Card with Hide/Show Toggle & Clear "This Month" Label */}
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

      {/* Spending Insight Card (Actionable Feedback) */}
      {spendingInsight && (
        <div
          className={cn(
            "rounded-2xl p-4 border shadow-sm transition-all",
            spendingInsight.type === 'warning'
              ? "bg-amber-50/70 border-amber-200"
              : spendingInsight.type === 'positive'
              ? "bg-emerald-50/70 border-emerald-200"
              : "bg-indigo-50/70 border-indigo-200"
          )}
        >
          <div className="flex items-start gap-3">
            <div
              className={cn(
                "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5",
                spendingInsight.type === 'warning'
                  ? "bg-amber-100 text-amber-700"
                  : spendingInsight.type === 'positive'
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-indigo-100 text-indigo-700"
              )}
            >
              {spendingInsight.type === 'warning' ? (
                <AlertTriangle size={18} />
              ) : (
                <Sparkles size={18} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-white/90 text-gray-700 border border-gray-200/60">
                  Monthly Insight
                </span>
              </div>
              <h3 className="text-sm font-bold text-gray-900 mt-1">{spendingInsight.headline}</h3>
              <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{spendingInsight.subtext}</p>
            </div>
          </div>
        </div>
      )}

      {/* Budget Health Bar with Category-Level Warnings */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <PieChart size={15} />
            </div>
            <div>
              <h2 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Monthly Budget</h2>
            </div>
          </div>
          <Link
            href="/budgets"
            className="min-h-[44px] -mr-2 px-2.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-0.5"
          >
            Details <ChevronRight size={14} />
          </Link>
        </div>

        {totalBudget > 0 ? (
          <div className="space-y-2">
            <div className="flex items-baseline justify-between text-xs">
              <span className="font-semibold text-gray-700">
                {formatCurrency(totalBudgetSpent)} <span className="text-gray-500 font-normal">spent</span>
              </span>
              <span className={`font-bold ${isOverBudget ? 'text-red-600' : 'text-gray-600'}`}>
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

            <div className="flex items-center justify-between text-[11px] text-gray-500 pt-0.5 font-medium">
              <span>{budgetPercent}% used</span>
              <span>Limit: {formatCurrency(totalBudget)}</span>
            </div>

            {/* Category-Level Budget Warnings */}
            {(overBudgets.length > 0 || nearBudgets.length > 0) && (
              <div className="mt-3 pt-3 border-t border-gray-100 space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block">
                  Category Warnings
                </span>
                <div className="space-y-1.5">
                  {overBudgets.map((b) => (
                    <Link
                      key={b.id}
                      href={`/budgets/${b.id}`}
                      className="flex items-center justify-between p-2.5 bg-red-50 hover:bg-red-100/80 border border-red-100 rounded-xl text-xs transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="shrink-0 text-red-600 font-bold">⚠️</span>
                        <span className="font-semibold text-red-800 truncate">{b.categoryName}</span>
                      </div>
                      <span className="font-bold text-red-600 shrink-0">
                        {b.percentage}% (Over by {formatCurrency(b.spentAmount - b.budgetAmount)})
                      </span>
                    </Link>
                  ))}
                  {nearBudgets.map((b) => (
                    <Link
                      key={b.id}
                      href={`/budgets/${b.id}`}
                      className="flex items-center justify-between p-2.5 bg-amber-50 hover:bg-amber-100/80 border border-amber-100 rounded-xl text-xs transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="shrink-0 text-amber-600 font-bold">⚡</span>
                        <span className="font-semibold text-amber-900 truncate">{b.categoryName}</span>
                      </div>
                      <span className="font-bold text-amber-700 shrink-0">
                        {b.percentage}% used
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between py-2 text-xs text-gray-600">
            <span>No active budgets this month</span>
            <Link
              href="/budgets"
              className="min-h-[44px] px-3 py-2 bg-indigo-50 text-indigo-600 rounded-xl font-semibold text-xs hover:bg-indigo-100 flex items-center transition-colors"
            >
              Set Budget
            </Link>
          </div>
        )}
      </div>

      {recentTransactions.length > 0 && <SpendingTrendChart data={spendingTrend} />}

      {/* Financial Health Score & Forecast Engine */}
      {financialHealth && (
        <FinancialHealthCard
          health={financialHealth}
          income={income}
        />
      )}

      {/* Visual Analytics: Category Spending Breakdown */}
      {categorySpendingBreakdown.length > 0 && (
        <CategoryBreakdownChart
          data={categorySpendingBreakdown}
          totalExpense={expense}
          momComparison={momComparison}
        />
      )}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900">Your Wallets</h2>
            <p className="text-xs text-gray-500 font-medium">Tap any wallet to manage</p>
          </div>
          <Link
            href="/accounts"
            className="min-h-[44px] px-2.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-0.5"
          >
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
                  href={`/accounts?edit=${acc.id}`}
                  className="bg-white rounded-2xl p-3.5 border border-gray-100 shadow-sm flex flex-col justify-between gap-2.5 hover:shadow-md active:scale-[0.98] transition-all min-h-[96px]"
                >
                  <div className="flex items-center justify-between">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${bg}`}>
                      <Icon size={16} />
                    </div>
                    <span className="text-[10px] uppercase font-semibold text-gray-500 tracking-wider">
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
            <p className="text-xs text-gray-600 mb-2">No wallets created yet</p>
            <Link
              href="/accounts"
              className="min-h-[44px] inline-flex items-center gap-1 text-xs font-semibold text-indigo-600"
            >
              <Plus size={14} /> Add Wallet
            </Link>
          </div>
        )}
      </div>

      {/* Upcoming Subscriptions & Bills */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900">Upcoming Subscriptions</h2>
            <p className="text-xs text-gray-500 font-medium">Recurring bills & renewals</p>
          </div>
          <Link
            href="/recurring"
            className="min-h-[44px] px-2.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-0.5"
          >
            {upcomingBills.length > 0 ? `Manage (${upcomingBills.length})` : 'Add'} <ChevronRight size={14} />
          </Link>
        </div>

        {upcomingBills.length > 0 ? (
          <div className="space-y-2">
            {upcomingBills.map((bill) => (
              <Link
                key={bill.id}
                href="/recurring"
                className="bg-white rounded-2xl p-3.5 border border-gray-100 shadow-sm flex items-center justify-between hover:shadow-md active:scale-[0.98] transition-all"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      backgroundColor: `${bill.categories?.color ?? '#6366f1'}1A`,
                    }}
                  >
                    <CategoryIcon
                      name={bill.categories?.icon ?? 'Repeat'}
                      size={20}
                      style={{ color: bill.categories?.color ?? '#6366f1' }}
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-gray-900 truncate">{bill.name}</p>
                    <p className="text-[11px] text-gray-500 font-medium mt-0.5">
                      Due {formatDate(bill.next_due_date)} • {bill.frequency}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0 font-bold text-xs text-gray-900">
                  {formatCurrency(bill.amount)}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="bg-gray-50 rounded-2xl p-4 text-center border border-dashed border-gray-200">
            <p className="text-xs text-gray-600 mb-2">No active subscriptions tracked</p>
            <Link
              href="/recurring"
              className="min-h-[44px] inline-flex items-center gap-1 text-xs font-semibold text-indigo-600"
            >
              <Plus size={14} /> Track Subscription
            </Link>
          </div>
        )}
      </div>

      {/* Recent Transactions (Grouped by Date + Account Name + Floating Add Shortcut) */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between mt-1">
          <div>
            <h2 className="text-base font-bold text-gray-900">Recent Transactions</h2>
            <p className="text-xs text-gray-500 font-medium">Latest activity</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/add"
              className="min-h-[44px] px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-xl text-xs font-semibold flex items-center gap-1 active:scale-95 transition-all"
            >
              <Plus size={14} /> Add
            </Link>
            <Link
              href="/transactions"
              className="min-h-[44px] px-2 text-xs font-semibold text-gray-600 hover:text-indigo-600 flex items-center transition-colors"
            >
              See all
            </Link>
          </div>
        </div>

        {recentTransactions.length > 0 ? (
          <div className="space-y-4">
            {Object.entries(groupedTransactions).map(([dateGroup, items]) => (
              <div key={dateGroup} className="space-y-1.5">
                <span className="text-xs font-semibold text-gray-500 px-1 block">
                  {dateGroup}
                </span>
                <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50 shadow-sm overflow-hidden">
                  {items.map((tx) => (
                    <TransactionItem
                      key={tx.id}
                      id={tx.id}
                      categoryName={tx.categories?.name || 'Unknown'}
                      categoryIcon={tx.categories?.icon || 'help-circle'}
                      categoryColor={tx.categories?.color || '#94a3b8'}
                      accountName={tx.accounts?.name}
                      note={tx.note}
                      amount={Number(tx.amount)}
                      type={tx.type}
                      date={tx.transaction_date}
                      onClick={() => setSelectedTx(tx)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center flex flex-col items-center justify-center">
            <p className="text-xs text-gray-500 mb-3">No transactions yet</p>
            <Link
              href="/add"
              className="min-h-[44px] px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 transition-colors flex items-center"
            >
              Add First Transaction
            </Link>
          </div>
        )}
      </div>

      {/* Notifications Modal Sheet */}
      {showNotifications && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={() => setShowNotifications(false)} />
          <div className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom sm:zoom-in-95 duration-200 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Bell size={16} />
                </div>
                <h2 className="text-lg font-bold text-gray-900">Notifications & Alerts</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowNotifications(false)}
                className="min-w-[44px] min-h-[44px] -mr-2 text-gray-500 hover:text-gray-700 flex items-center justify-center"
                aria-label="Close notifications"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3">
              {overBudgets.map((b) => (
                <div
                  key={b.id}
                  className="p-3.5 bg-red-50 border border-red-200 rounded-2xl text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-red-700 flex items-center gap-1.5">
                      <AlertTriangle size={14} /> Over Budget Alert
                    </span>
                    <span className="text-[11px] font-bold text-red-600">{b.percentage}%</span>
                  </div>
                  <p className="text-gray-700">
                    <span className="font-semibold">{b.categoryName}</span> exceeded its monthly limit by{' '}
                    <span className="font-bold">{formatCurrency(b.spentAmount - b.budgetAmount)}</span>.
                  </p>
                  <Link
                    href={`/budgets/${b.id}`}
                    onClick={() => setShowNotifications(false)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 hover:underline pt-1"
                  >
                    Adjust Budget <ChevronRight size={12} />
                  </Link>
                </div>
              ))}

              {nearBudgets.map((b) => (
                <div
                  key={b.id}
                  className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-800 flex items-center gap-1.5">
                      <AlertTriangle size={14} /> Approaching Limit
                    </span>
                    <span className="text-[11px] font-bold text-amber-700">{b.percentage}%</span>
                  </div>
                  <p className="text-gray-700">
                    <span className="font-semibold">{b.categoryName}</span> has used {b.percentage}% of its allocated budget.
                  </p>
                  <Link
                    href={`/budgets/${b.id}`}
                    onClick={() => setShowNotifications(false)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-amber-800 hover:underline pt-1"
                  >
                    View Category <ChevronRight size={12} />
                  </Link>
                </div>
              ))}

              {spendingInsight && (
                <div className="p-3.5 bg-indigo-50 border border-indigo-200 rounded-2xl text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-indigo-700 flex items-center gap-1.5">
                      <TrendingUp size={14} /> Monthly Insight
                    </span>
                  </div>
                  <p className="font-semibold text-gray-900">{spendingInsight.headline}</p>
                  <p className="text-gray-600">{spendingInsight.subtext}</p>
                </div>
              )}

              {overBudgets.length === 0 && nearBudgets.length === 0 && (
                <div className="py-8 text-center space-y-2">
                  <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                    <CheckCircle2 size={24} />
                  </div>
                  <h3 className="font-bold text-gray-900 text-sm">All Caught Up!</h3>
                  <p className="text-xs text-gray-500 max-w-xs mx-auto">
                    Your budgets and accounts are in great shape. No urgent alerts this month.
                  </p>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowNotifications(false)}
              className="min-h-[44px] w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-semibold transition-colors mt-5"
            >
              Done
            </button>
          </div>
        </div>
      )}

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

'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Trash2, Edit3, Calendar, AlertCircle, Loader2, X } from 'lucide-react';
import dynamic from 'next/dynamic';
import { CategoryIcon } from '@/constants/categories';
import { formatCurrency } from '@/lib/utils';
import { BudgetProgress } from '@/components/budget-progress';

const BudgetChart = dynamic(() => import('@/components/budget-chart').then((m) => m.BudgetChart), {
  ssr: false,
  loading: () => <div className="h-64 animate-pulse rounded-2xl bg-gray-50" aria-hidden />,
});
import { TransactionItem } from '@/components/transaction-item';
import { deleteBudget, updateBudget, type BudgetDetailResult, type BudgetCategory } from '@/app/actions/budgets';

export type { BudgetCategory };

interface BudgetDetailClientProps {
  budget: BudgetDetailResult;
  categories: BudgetCategory[];
}

export function BudgetDetailClient({ budget, categories }: BudgetDetailClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editError, setEditError] = useState('');

  const [editData, setEditData] = useState({
    category_id: budget.category?.id ?? '',
    amount: String(budget.amount),
    startDate: budget.startDate,
    endDate: budget.endDate,
  });

  const handleDelete = () => {
    startTransition(async () => {
      try {
        await deleteBudget(budget.id);
        router.push('/budgets');
      } catch (err) {
        console.error('Failed to delete budget:', err);
      }
    });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editData.category_id || !editData.amount) {
      setEditError('Please fill in all fields.');
      return;
    }
    if (new Date(editData.endDate) < new Date(editData.startDate)) {
      setEditError('End date must be on or after start date.');
      return;
    }

    setEditError('');
    startTransition(async () => {
      try {
        await updateBudget(budget.id, {
          category_id: editData.category_id,
          amount: parseFloat(editData.amount),
          startDate: editData.startDate,
          endDate: editData.endDate,
        });
        setShowEditModal(false);
        router.refresh();
      } catch (err: unknown) {
        setEditError(err instanceof Error ? err.message : 'Failed to update budget');
      }
    });
  };

  const isOverBudget = budget.spent > budget.amount;

  return (
    <div className="min-h-screen pb-24 p-4 space-y-6">
      {/* Top App Bar */}
      <div className="flex items-center justify-between">
        <Link
          href="/budgets"
          className="p-2 -ml-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
          aria-label="Back to budgets"
        >
          <ChevronLeft size={24} />
        </Link>
        <div className="flex items-center gap-2">
          <div 
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ backgroundColor: `${budget.category?.color ?? '#6366F1'}1A` }}
          >
            <CategoryIcon
              name={budget.category?.icon ?? 'Package'}
              size={18}
              style={{ color: budget.category?.color ?? '#6366F1' }}
            />
          </div>
          <h1 className="font-bold text-lg text-gray-900">{budget.category?.name ?? 'Budget'}</h1>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowEditModal(true)}
            className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
            aria-label="Edit budget"
          >
            <Edit3 size={18} />
          </button>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
            aria-label="Delete budget"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      {/* Primary Status Card */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 space-y-4">
        <div className="flex justify-between items-start">
          <div>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Remaining Budget</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className={`text-2xl font-black ${isOverBudget ? 'text-red-600' : 'text-gray-900'}`}>
                {isOverBudget ? '-' : ''}{formatCurrency(Math.abs(budget.remaining))}
              </span>
              {isOverBudget && (
                <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full ml-1">
                  Over budget
                </span>
              )}
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Daily Safe Spend</span>
            <p className="text-sm font-bold text-indigo-600 mt-0.5">
              {formatCurrency(budget.dailySafeSpend)} <span className="text-[11px] font-normal text-gray-400">/day</span>
            </p>
          </div>
        </div>

        {/* Progress Bar with Today Indicator */}
        <BudgetProgress
          categoryName={budget.category?.name ?? 'Category'}
          categoryIcon={budget.category?.icon ?? 'Package'}
          categoryColor={budget.category?.color ?? '#6366F1'}
          spent={budget.spent}
          limit={budget.amount}
          startDate={budget.startDate}
          endDate={budget.endDate}
        />

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-100 text-center">
          <div className="bg-gray-50 p-2.5 rounded-2xl">
            <span className="text-[10px] text-gray-400 uppercase font-semibold">Total Budget</span>
            <p className="text-xs font-bold text-gray-900 mt-0.5">{formatCurrency(budget.amount)}</p>
          </div>
          <div className="bg-gray-50 p-2.5 rounded-2xl">
            <span className="text-[10px] text-gray-400 uppercase font-semibold">Total Spent</span>
            <p className="text-xs font-bold text-gray-900 mt-0.5">{formatCurrency(budget.spent)}</p>
          </div>
          <div className="bg-gray-50 p-2.5 rounded-2xl">
            <span className="text-[10px] text-gray-400 uppercase font-semibold">Days Left</span>
            <p className="text-xs font-bold text-gray-900 mt-0.5">{budget.daysRemaining} days</p>
          </div>
        </div>
      </div>

      {/* 3-Line Spending Trajectory Graph */}
      <BudgetChart data={budget.chartData} budgetLimit={budget.amount} />

      {/* Transaction List for this Budget */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="font-bold text-gray-900 text-base">Transactions in Period</h2>
          <span className="text-xs text-gray-400 font-medium">
            {budget.transactions.length} expense{budget.transactions.length === 1 ? '' : 's'}
          </span>
        </div>

        {budget.transactions.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-gray-100 shadow-sm">
            <AlertCircle size={32} className="mx-auto text-gray-300 mb-2" />
            <p className="text-sm font-semibold text-gray-600">No transactions recorded</p>
            <p className="text-xs text-gray-400 mt-0.5">
              Expenses added in this category and date range will automatically appear here.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50 shadow-sm overflow-hidden">
            {budget.transactions.map((t) => (
              <TransactionItem
                key={t.id}
                id={t.id}
                categoryName={t.categoryName}
                categoryIcon={t.categoryIcon}
                categoryColor={t.categoryColor}
                note={t.note}
                amount={t.amount}
                type={t.type}
                date={t.transaction_date}
              />
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={() => setShowDeleteModal(false)} />
          <div className="relative w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200 text-center">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Budget</h3>
            <p className="text-sm text-gray-500 mb-6">Are you sure you want to delete this budget? This action cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={isPending}
                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isPending}
                className="flex-1 py-3 bg-red-600 text-white rounded-xl font-medium shadow-sm hover:bg-red-700 transition-colors flex items-center justify-center"
              >
                {isPending ? <Loader2 size={18} className="animate-spin" /> : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Budget Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={() => setShowEditModal(false)} />
          <div className="relative w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Edit Budget</h3>
              <button 
                onClick={() => setShowEditModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Category</label>
                <select
                  required
                  value={editData.category_id}
                  onChange={(e) => setEditData({ ...editData, category_id: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white text-gray-900 text-sm"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Budget Amount</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={editData.amount}
                  onChange={(e) => setEditData({ ...editData, amount: e.target.value })}
                  placeholder="0.00"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-600 text-gray-900 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    <span className="flex items-center gap-1">
                      <Calendar size={12} /> Start Date
                    </span>
                  </label>
                  <input
                    type="date"
                    required
                    value={editData.startDate}
                    onChange={(e) => setEditData({ ...editData, startDate: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-600 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    <span className="flex items-center gap-1">
                      <Calendar size={12} /> End Date
                    </span>
                  </label>
                  <input
                    type="date"
                    required
                    value={editData.endDate}
                    onChange={(e) => setEditData({ ...editData, endDate: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-600 text-gray-900"
                  />
                </div>
              </div>

              {editError && (
                <p className="text-red-500 text-xs mt-1">{editError}</p>
              )}

              <button
                type="submit"
                disabled={isPending || !editData.category_id || !editData.amount}
                className="w-full bg-indigo-600 text-white font-medium py-3.5 rounded-xl mt-4 disabled:opacity-50 active:scale-[0.98] transition-all hover:bg-indigo-700 shadow-sm flex items-center justify-center"
              >
                {isPending ? <Loader2 size={18} className="animate-spin" /> : 'Save Changes'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

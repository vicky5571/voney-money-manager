'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { AnimatedPage } from '@/components/animated-page';
import { BudgetProgress } from '@/components/budget-progress';
import { createBudget } from '@/app/actions/budgets';
import { useTransition } from 'react';

type Budget = {
  id: string;
  amount: number;
  month: number;
  year: number;
  category: any;
  spent: number;
};

export function BudgetsClient({ 
  initialBudgets, 
  categories,
  initialMonth,
  initialYear
}: { 
  initialBudgets: Budget[];
  categories: any[];
  initialMonth: number;
  initialYear: number;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [formData, setFormData] = useState({
    category_id: '',
    amount: ''
  });

  const handlePrevMonth = () => {
    const newMonth = initialMonth === 1 ? 12 : initialMonth - 1;
    const newYear = initialMonth === 1 ? initialYear - 1 : initialYear;
    router.push(`/budgets?month=${newMonth}&year=${newYear}`);
  };

  const handleNextMonth = () => {
    const newMonth = initialMonth === 12 ? 1 : initialMonth + 1;
    const newYear = initialMonth === 12 ? initialYear + 1 : initialYear;
    router.push(`/budgets?month=${newMonth}&year=${newYear}`);
  };

  const monthName = new Date(initialYear, initialMonth - 1).toLocaleString('default', { month: 'long' });

  // Filter out categories that already have a budget this month
  const availableCategories = categories.filter(
    c => !initialBudgets.some(b => b.category?.id === c.id)
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.category_id || !formData.amount) return;
    
    startTransition(async () => {
      try {
        await createBudget({
          category_id: formData.category_id,
          amount: parseFloat(formData.amount),
          month: initialMonth,
          year: initialYear
        });
        setIsOpen(false);
        setFormData({ category_id: '', amount: '' });
      } catch (error) {
        console.error(error);
      }
    });
  };

  return (
    <div className="min-h-screen pb-24 relative p-4 space-y-6">
      {/* Month Navigation */}
      <div className="flex items-center justify-between bg-white rounded-2xl p-4 shadow-sm">
        <button onClick={handlePrevMonth} className="p-2 hover:bg-gray-100 rounded-full">
          <ChevronLeft size={20} />
        </button>
        <h2 className="font-semibold text-gray-900">{monthName} {initialYear}</h2>
        <button onClick={handleNextMonth} className="p-2 hover:bg-gray-100 rounded-full">
          <ChevronRight size={20} />
        </button>
      </div>

      <AnimatedPage className="space-y-4">
        {initialBudgets.length === 0 ? (
          <div className="text-center py-10 bg-gray-50 rounded-2xl border border-gray-100">
            <p className="text-gray-500 text-sm">No budgets set for this month. Create one to start tracking.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {initialBudgets.map((budget) => (
              <div key={budget.id} data-animate className="opacity-0 translate-y-4">
                <BudgetProgress
                  categoryName={budget.category?.name ?? 'Unknown'}
                  categoryIcon={budget.category?.icon ?? 'Package'}
                  categoryColor={budget.category?.color ?? '#6B7280'}
                  spent={budget.spent}
                  limit={budget.amount}
                />
              </div>
            ))}
          </div>
        )}
      </AnimatedPage>

      {/* Add Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 right-4 w-14 h-14 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-indigo-700 transition-colors z-40"
      >
        <Plus size={24} />
      </button>

      {/* Bottom Sheet Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm">
          <div 
            className="w-full max-w-md bg-white rounded-t-3xl p-6 pb-safe animate-in slide-in-from-bottom duration-300"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">Add Budget</h3>
              <button 
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <select
                  required
                  value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white"
                >
                  <option value="" disabled>Select category</option>
                  {availableCategories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0.00"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <button
                type="submit"
                disabled={isPending || !formData.category_id || !formData.amount}
                className="w-full bg-indigo-600 text-white font-medium py-3.5 rounded-xl mt-4 disabled:opacity-50 active:scale-[0.98] transition-transform"
              >
                {isPending ? 'Saving...' : 'Save Budget'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

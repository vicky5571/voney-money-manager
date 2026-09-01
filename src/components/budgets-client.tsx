"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  X,
  Calendar,
  Loader2,
  Tags,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { BudgetProgress } from "@/components/budget-progress";
import { BudgetSummaryGauge } from "@/components/budget-summary-gauge";
import { createBudget, deleteBudget } from "@/app/actions/budgets";
import {
  CategoryManagerSheet,
  type CategoryItem,
} from "@/components/category-manager-sheet";
import { sortCategoriesByOrder } from "@/lib/utils";

export interface BudgetCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export interface BudgetData {
  id: string;
  amount: number;
  startDate: string;
  endDate: string;
  month?: number | null;
  year?: number | null;
  category: BudgetCategory | null;
  spent: number;
}

interface BudgetsClientProps {
  initialBudgets: BudgetData[];
  categories: CategoryItem[];
  initialMonth: number;
  initialYear: number;
}

export function BudgetsClient({
  initialBudgets,
  categories,
  initialMonth,
  initialYear,
}: BudgetsClientProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Form default start & end dates for the selected viewing month
  const getDefaultStartDate = () => {
    return `${initialYear}-${String(initialMonth).padStart(2, "0")}-01`;
  };

  const getDefaultEndDate = () => {
    const lastDay = new Date(initialYear, initialMonth, 0).getDate();
    return `${initialYear}-${String(initialMonth).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  };

  const [formData, setFormData] = useState({
    category_id: "",
    amount: "",
    startDate: getDefaultStartDate(),
    endDate: getDefaultEndDate(),
  });

  const openModal = () => {
    setFormData({
      category_id: "",
      amount: "",
      startDate: getDefaultStartDate(),
      endDate: getDefaultEndDate(),
    });
    setError("");
    setIsOpen(true);
  };

  const setPreset = (preset: "month" | "30days" | "14days") => {
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];

    if (preset === "month") {
      setFormData((prev) => ({
        ...prev,
        startDate: getDefaultStartDate(),
        endDate: getDefaultEndDate(),
      }));
    } else if (preset === "30days") {
      const future = new Date(now);
      future.setDate(future.getDate() + 30);
      setFormData((prev) => ({
        ...prev,
        startDate: todayStr,
        endDate: future.toISOString().split("T")[0],
      }));
    } else if (preset === "14days") {
      const future = new Date(now);
      future.setDate(future.getDate() + 14);
      setFormData((prev) => ({
        ...prev,
        startDate: todayStr,
        endDate: future.toISOString().split("T")[0],
      }));
    }
  };

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

  const monthName = new Date(initialYear, initialMonth - 1).toLocaleString(
    "default",
    { month: "long" },
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.category_id || !formData.amount) {
      setError("Please fill in all required fields.");
      return;
    }

    if (new Date(formData.endDate) < new Date(formData.startDate)) {
      setError("End date must be on or after start date.");
      return;
    }

    setError("");
    startTransition(async () => {
      try {
        await createBudget({
          category_id: formData.category_id,
          amount: parseFloat(formData.amount),
          startDate: formData.startDate,
          endDate: formData.endDate,
        });
        setIsOpen(false);
        router.refresh();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to save budget");
      }
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      try {
        await deleteBudget(id);
        setDeleteTargetId(null);
        router.refresh();
      } catch (err: unknown) {
        console.error("Failed to delete budget:", err);
      }
    });
  };

  // Compute summary totals
  const totalBudget = initialBudgets.reduce((sum, b) => sum + b.amount, 0);
  const totalSpent = initialBudgets.reduce((sum, b) => sum + b.spent, 0);

  // Compute days left in the selected month (midnight normalized)
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const lastDayOfMonth = new Date(initialYear, initialMonth, 0).getDate();

  let daysLeft = 0;
  if (initialYear === currentYear && initialMonth === currentMonth) {
    daysLeft = Math.max(0, lastDayOfMonth - now.getDate());
  } else if (
    initialYear > currentYear ||
    (initialYear === currentYear && initialMonth > currentMonth)
  ) {
    daysLeft = lastDayOfMonth;
  } else {
    daysLeft = 0;
  }

  return (
    <div className="min-h-screen pb-24 relative p-4 space-y-6">
      {/* Month Navigation */}
      <div className="flex items-center justify-between bg-white rounded-2xl p-3 sm:p-4 shadow-sm border border-gray-100">
        <button
          onClick={handlePrevMonth}
          className="p-2 hover:bg-gray-100 rounded-full cursor-pointer transition-colors"
          aria-label="Previous month"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="text-center">
          <h2 className="font-semibold text-gray-900 text-sm sm:text-base">
            {monthName} {initialYear}
          </h2>
          <span className="text-[11px] text-gray-400">Active budgets</span>
        </div>
        <button
          onClick={handleNextMonth}
          className="p-2 hover:bg-gray-100 rounded-full cursor-pointer transition-colors"
          aria-label="Next month"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Half Circle Gauge Summary Card */}
      <BudgetSummaryGauge
        totalBudget={totalBudget}
        totalSpent={totalSpent}
        daysLeft={daysLeft}
        onAddBudget={openModal}
      />

      {/* Category Budgets Section Header */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h3 className="text-sm font-bold text-gray-900">Category Budgets</h3>
          <p className="text-[11px] text-gray-400">
            {initialBudgets.length}{" "}
            {initialBudgets.length === 1 ? "budget" : "budgets"} tracked
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCategoryManager(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-all active:scale-95 cursor-pointer border border-emerald-100/70 shadow-2xs"
        >
          <Tags size={13} className="text-emerald-500" />
          <span>Categories</span>
        </button>
      </div>

      <div className="space-y-4">
        {initialBudgets.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-2xl border border-gray-100 px-4">
            <p className="text-gray-500 font-medium text-sm">
              No budgets active for this period.
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Create a budget with a custom date range to start tracking.
            </p>
            <button
              onClick={openModal}
              className="mt-4 px-4 py-2 bg-emerald-500 text-white rounded-xl text-xs font-semibold hover:bg-emerald-500 transition-colors"
            >
              Add Your First Budget
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {initialBudgets.map((budget) => (
              <Link
                key={budget.id}
                href={`/budgets/${budget.id}`}
                className="block transition-transform active:scale-[0.99]"
              >
                <BudgetProgress
                  categoryName={budget.category?.name ?? "Unknown"}
                  categoryIcon={budget.category?.icon ?? "Package"}
                  categoryColor={budget.category?.color ?? "#6B7280"}
                  spent={budget.spent}
                  limit={budget.amount}
                  startDate={budget.startDate}
                  endDate={budget.endDate}
                  onDelete={() => setDeleteTargetId(budget.id)}
                />
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteTargetId && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="absolute inset-0"
            onClick={() => setDeleteTargetId(null)}
          />
          <div className="relative w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200 text-center">
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Delete Budget
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              Are you sure you want to delete this budget?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTargetId(null)}
                disabled={isPending}
                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteTargetId && handleDelete(deleteTargetId)}
                disabled={isPending}
                className="flex-1 py-3 bg-red-600 text-white rounded-xl font-medium shadow-sm hover:bg-red-700 transition-colors flex items-center justify-center"
              >
                {isPending ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  "Delete"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Budget Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={() => setIsOpen(false)} />
          <div className="relative w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Add Budget</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Set category, amount, and custom date range
                </p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Category */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-medium text-gray-700">
                    Category
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowCategoryManager(true)}
                    className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Tags size={12} />
                    <span>+ Manage</span>
                  </button>
                </div>
                <select
                  required
                  value={formData.category_id}
                  onChange={(e) =>
                    setFormData({ ...formData, category_id: e.target.value })
                  }
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-gray-900 text-sm"
                >
                  <option value="" disabled>
                    Select category
                  </option>
                  {sortCategoriesByOrder(
                    categories.filter(
                      (c) =>
                        c.type === "expense" &&
                        c.name.toLowerCase() !== "transfer",
                    ),
                  ).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Budget Amount
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) =>
                    setFormData({ ...formData, amount: e.target.value })
                  }
                  placeholder="e.g. 1500000"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 text-sm"
                />
              </div>

              {/* Date Presets */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Duration Presets
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPreset("month")}
                    className="flex-1 py-1.5 px-2 bg-emerald-50 text-emerald-500 hover:bg-emerald-100 rounded-lg text-xs font-semibold transition-colors"
                  >
                    This Month
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreset("30days")}
                    className="flex-1 py-1.5 px-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg text-xs font-semibold transition-colors"
                  >
                    Next 30 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreset("14days")}
                    className="flex-1 py-1.5 px-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg text-xs font-semibold transition-colors"
                  >
                    Next 14 Days
                  </button>
                </div>
              </div>

              {/* Custom Date Range */}
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
                    value={formData.startDate}
                    onChange={(e) =>
                      setFormData({ ...formData, startDate: e.target.value })
                    }
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900"
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
                    value={formData.endDate}
                    onChange={(e) =>
                      setFormData({ ...formData, endDate: e.target.value })
                    }
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900"
                  />
                </div>
              </div>

              {error && <p className="text-red-500 text-xs mt-1">{error}</p>}

              <button
                type="submit"
                disabled={
                  isPending || !formData.category_id || !formData.amount
                }
                className="w-full bg-emerald-500 text-white font-medium py-3.5 rounded-xl mt-4 disabled:opacity-50 active:scale-[0.98] transition-all hover:bg-emerald-500 shadow-sm flex items-center justify-center"
              >
                {isPending ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  "Save Budget"
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Category Manager Sheet */}
      <CategoryManagerSheet
        isOpen={showCategoryManager}
        onClose={() => {
          setShowCategoryManager(false);
          router.refresh();
        }}
        categories={categories}
      />
    </div>
  );
}

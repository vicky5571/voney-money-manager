"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  getTransactions,
  getMonthOverview,
  getTransactionsForExport,
  deleteTransaction,
} from "@/app/actions/transactions";
import { TransactionItem } from "@/components/transaction-item";
import { TransactionDetailSheet } from "@/components/transaction-detail-sheet";
import { FinancialHealthCard } from "@/components/financial-health-card";
import type { FinancialHealthResult } from "@/lib/financial-health";
import { useAppStore, type CachedTransaction } from "@/lib/store/use-app-store";
import {
  Search,
  TrendingUp,
  TrendingDown,
  Receipt,
  X,
  ChevronLeft,
  ChevronRight,
  Download,
} from "lucide-react";
import { formatDate, formatCurrency, cn } from "@/lib/utils";

type Transaction = {
  id: string;
  type: "income" | "expense";
  amount: number;
  note: string | null;
  transaction_date: string;
  created_at: string;
  isPending?: boolean;
  is_settled?: boolean;
  categories: {
    id: string;
    name: string;
    icon: string;
    color: string;
    scope?: string;
  } | null;
  accounts: { id: string; name: string } | null;
};

type FilterType = "all" | "income" | "expense";

type MonthSummary = { income: number; expense: number; net: number };

function mapRaw(t: Record<string, unknown>): Transaction {
  const cat = Array.isArray(t.categories) ? t.categories[0] : t.categories;
  const acc = Array.isArray(t.accounts) ? t.accounts[0] : t.accounts;
  return {
    id: String(t.id),
    type: t.type as "income" | "expense",
    amount: Number(t.amount),
    note: t.note ? String(t.note) : null,
    transaction_date: String(t.transaction_date),
    created_at: String(t.created_at),
    isPending: Boolean(t.isPending),
    is_settled: t.is_settled !== undefined ? Boolean(t.is_settled) : true,
    categories: cat
      ? {
          id: String(cat.id),
          name: String(cat.name),
          icon: String(cat.icon),
          color: String(cat.color),
          scope: (cat as { scope?: string }).scope
            ? String((cat as { scope?: string }).scope)
            : undefined,
        }
      : null,
    accounts: acc ? { id: String(acc.id), name: String(acc.name) } : null,
  };
}

export default function TransactionsPage() {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const monthKey = `${selectedMonth}-${selectedYear}`;
  const {
    txCache,
    summaryCache,
    healthCache,
    setTransactionsForMonth,
    setSummaryForMonth,
    setHealthForMonth,
    optimisticDeleteTransaction,
    optimisticSettleTransaction,
  } = useAppStore();

  const cachedTxs = txCache[monthKey];
  const cachedSummary = summaryCache[monthKey];
  const cachedHealth = healthCache[monthKey];

  const [transactions, setTransactions] = useState<Transaction[]>(() =>
    cachedTxs ? (cachedTxs as Transaction[]) : [],
  );
  const [loading, setLoading] = useState<boolean>(() => !cachedTxs);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [summary, setSummary] = useState<MonthSummary | null>(
    () => cachedSummary || null,
  );
  const [health, setHealth] = useState<FinancialHealthResult | null>(
    () => cachedHealth || null,
  );
  const [counts, setCounts] = useState<{
    all: number;
    income: number;
    expense: number;
  } | null>(null);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const observerRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Consolidated batch overview fetch (Summary + Financial Health + Counts in 1 roundtrip & 1 render cycle)
  useEffect(() => {
    let ignore = false;
    getMonthOverview({
      month: selectedMonth,
      year: selectedYear,
      search: search || undefined,
    })
      .then(
        ({ summary: nextSummary, health: nextHealth, counts: nextCounts }) => {
          if (!ignore) {
            setSummary(nextSummary);
            setSummaryForMonth(monthKey, nextSummary);
            setHealth(nextHealth);
            setHealthForMonth(monthKey, nextHealth);
            setCounts(nextCounts);
          }
        },
      )
      .catch(console.error);

    return () => {
      ignore = true;
    };
  }, [
    selectedMonth,
    selectedYear,
    search,
    monthKey,
    setSummaryForMonth,
    setHealthForMonth,
  ]);

  // Initial load + background refresh on filter / search / month change
  const hasCacheRef = useRef(!!cachedTxs);
  useEffect(() => {
    hasCacheRef.current = !!txCache[monthKey];
  }, [txCache, monthKey]);

  useEffect(() => {
    let ignore = false;

    async function loadInitial() {
      // Only show full loading spinner if we don't have cached data
      if (!hasCacheRef.current || search || filter !== "all") {
        setLoading(true);
      }

      try {
        const result = await getTransactions({
          page: 1,
          limit: 20,
          type: filter === "all" ? undefined : filter,
          search: search || undefined,
          month: selectedMonth,
          year: selectedYear,
        });
        if (ignore) return;
        const mapped = (
          result.transactions as unknown as Record<string, unknown>[]
        ).map(mapRaw);

        // Merge any locally pending transactions for this month
        const pendingInMonth = (useAppStore.getState().txCache[monthKey] || [])
          .filter((t) => t.isPending)
          .map((t) => ({ ...t, isPending: true } as unknown as Transaction));
        const serverIds = new Set(mapped.map((m) => m.id));
        const combined = [
          ...pendingInMonth.filter((p) => !serverIds.has(p.id)),
          ...mapped,
        ];

        setTransactions(combined);
        setHasMore(result.hasMore);
        setPage(1);
        pageRef.current = 1;

        if (!search && filter === "all") {
          setTransactionsForMonth(monthKey, combined as CachedTransaction[]);
        }
      } catch (err) {
        console.error("Failed to fetch transactions:", err);
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    loadInitial();
    return () => {
      ignore = true;
    };
  }, [
    filter,
    search,
    selectedMonth,
    selectedYear,
    monthKey,
    setTransactionsForMonth,
  ]);

  const pageRef = useRef(page);
  const loadMoreTransactions = useCallback(
    async (pageNum: number) => {
      try {
        setLoadingMore(true);
        const result = await getTransactions({
          page: pageNum,
          limit: 20,
          type: filter === "all" ? undefined : filter,
          search: search || undefined,
          month: selectedMonth,
          year: selectedYear,
        });
        setTransactions((prev) => [
          ...prev,
          ...(result.transactions as unknown as Record<string, unknown>[]).map(
            mapRaw,
          ),
        ]);
        setHasMore(result.hasMore);
      } catch (err) {
        console.error("Failed to load more transactions:", err);
      } finally {
        setLoadingMore(false);
      }
    },
    [filter, search, selectedMonth, selectedYear],
  );

  // Infinite scroll
  useEffect(() => {
    if (!observerRef.current || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          const nextPage = pageRef.current + 1;
          pageRef.current = nextPage;
          setPage(nextPage);
          loadMoreTransactions(nextPage);
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(observerRef.current);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loadMoreTransactions]);

  // Month navigation
  const goToPrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear((y) => y - 1);
    } else setSelectedMonth((m) => m - 1);
  };
  const goToNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear((y) => y + 1);
    } else setSelectedMonth((m) => m + 1);
  };

  // Debounced search
  const handleSearch = (value: string) => {
    setSearchInput(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => setSearch(value), 300);
  };

  const clearSearch = () => {
    setSearchInput("");
    setSearch("");
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
  };

  // CSV Export
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const rows = await getTransactionsForExport({
        month: selectedMonth,
        year: selectedYear,
        type: filter === "all" ? undefined : filter,
        search: search || undefined,
      });

      const escape = (val: string) =>
        `"${String(val ?? "").replace(/"/g, '""')}"`;
      const header = "Date,Type,Category,Account,Amount,Note";
      const lines = (rows as Record<string, unknown>[]).map((t) => {
        const cat = Array.isArray(t.categories)
          ? t.categories[0]
          : t.categories;
        const acc = Array.isArray(t.accounts) ? t.accounts[0] : t.accounts;
        return [
          escape(String(t.transaction_date)),
          escape(String(t.type)),
          escape(cat ? String((cat as Record<string, unknown>).name) : ""),
          escape(acc ? String((acc as Record<string, unknown>).name) : ""),
          Number(t.amount).toFixed(2),
          escape(t.note ? String(t.note) : ""),
        ].join(",");
      });

      const csv = [header, ...lines].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const monthLabel = new Date(
        selectedYear,
        selectedMonth - 1,
      ).toLocaleString("default", { month: "short", year: "numeric" });
      a.href = url;
      a.download = `transactions-${monthLabel.replace(" ", "-")}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      console.error("Export failed");
    } finally {
      setIsExporting(false);
    }
  };

  // Swipe delete — optimistic removal in store then server delete
  const handleSwipeDelete = async (id: string) => {
    const snapshot = transactions.find((t) => t.id === id);
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    optimisticDeleteTransaction(id, monthKey);
    try {
      await deleteTransaction(id);
      // Refresh aggregates in 1 batch
      getMonthOverview({
        month: selectedMonth,
        year: selectedYear,
        search: search || undefined,
      })
        .then(
          ({
            summary: nextSummary,
            health: nextHealth,
            counts: nextCounts,
          }) => {
            setSummary(nextSummary);
            setSummaryForMonth(monthKey, nextSummary);
            setHealth(nextHealth);
            setHealthForMonth(monthKey, nextHealth);
            setCounts(nextCounts);
          },
        )
        .catch(console.error);
    } catch {
      // Rollback optimistic removal
      if (snapshot) {
        setTransactions((prev) => {
          const idx = prev.findIndex(
            (t) => t.transaction_date <= snapshot.transaction_date,
          );
          if (idx === -1) return [...prev, snapshot];
          const copy = [...prev];
          copy.splice(idx, 0, snapshot);
          return copy;
        });
      }
      console.error("Failed to delete transaction");
    }
  };

  // Detail-sheet delete: remove from local state + refresh aggregates
  const handleDetailDelete = (id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    optimisticDeleteTransaction(id, monthKey);
    getMonthOverview({
      month: selectedMonth,
      year: selectedYear,
      search: search || undefined,
    })
      .then(
        ({ summary: nextSummary, health: nextHealth, counts: nextCounts }) => {
          setSummary(nextSummary);
          setSummaryForMonth(monthKey, nextSummary);
          setHealth(nextHealth);
          setHealthForMonth(monthKey, nextHealth);
          setCounts(nextCounts);
        },
      )
      .catch(console.error);
    setSelectedTx(null);
  };

  const handleDetailSettle = (id: string) => {
    const tx = transactions.find((t) => t.id === id);
    if (tx) {
      setTransactions((prev) =>
        prev.map((t) => (t.id === id ? { ...t, is_settled: true } : t))
      );
      optimisticSettleTransaction(id, tx.amount, tx.type);
    }
  };

  // Group by date
  const grouped = transactions.reduce<Record<string, Transaction[]>>(
    (acc, t) => {
      const key = formatDate(t.transaction_date);
      if (!acc[key]) acc[key] = [];
      acc[key].push(t);
      return acc;
    },
    {},
  );

  const monthName = new Date(selectedYear, selectedMonth - 1).toLocaleString(
    "default",
    { month: "long" },
  );

  return (
    <div className="px-4 pt-6 pb-28">
      {/* Header: title + month nav + export */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Transactions</h1>
        <button
          onClick={handleExport}
          disabled={isExporting}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-600 rounded-xl text-xs font-semibold hover:bg-gray-200 active:scale-95 transition-all disabled:opacity-50"
        >
          <Download size={13} />
          {isExporting ? "Exporting…" : "Export CSV"}
        </button>
      </div>

      {/* Month navigation */}
      <div className="flex items-center justify-between bg-white rounded-2xl p-3 shadow-sm border border-gray-100 mb-4">
        <button
          onClick={goToPrevMonth}
          className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
          aria-label="Previous month"
        >
          <ChevronLeft size={20} className="text-gray-500" />
        </button>
        <span className="text-sm font-semibold text-gray-900">
          {monthName} {selectedYear}
        </span>
        <button
          onClick={goToNextMonth}
          className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
          aria-label="Next month"
        >
          <ChevronRight size={20} className="text-gray-500" />
        </button>
      </div>

      {/* Month summary bar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
          {monthName} Overview
        </p>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <div className="flex items-center gap-1 text-emerald-500 mb-0.5">
              <TrendingUp size={13} />
              <span className="text-[10px] font-semibold uppercase tracking-wide">
                Income
              </span>
            </div>
            <p className="text-sm font-bold text-gray-900 truncate">
              {summary ? formatCurrency(summary.income) : "—"}
            </p>
          </div>
          <div>
            <div className="flex items-center gap-1 text-red-500 mb-0.5">
              <TrendingDown size={13} />
              <span className="text-[10px] font-semibold uppercase tracking-wide">
                Expense
              </span>
            </div>
            <p className="text-sm font-bold text-gray-900 truncate">
              {summary ? formatCurrency(summary.expense) : "—"}
            </p>
          </div>
          <div>
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide block mb-0.5">
              Net
            </span>
            <p
              className={`text-sm font-bold truncate ${summary && summary.net >= 0 ? "text-emerald-500" : "text-red-500"}`}
            >
              {summary
                ? `${summary.net >= 0 ? "+" : ""}${formatCurrency(summary.net)}`
                : "—"}
            </p>
          </div>
        </div>
      </div>

      {/* Financial Health & Savings Target Score for Selected Month */}
      {health && (
        <div className="mb-4">
          <FinancialHealthCard health={health} income={summary?.income ?? 0} />
        </div>
      )}

      {/* Search bar */}
      <div className="relative mb-3">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          size={18}
        />
        <input
          type="text"
          placeholder="Search transactions..."
          value={searchInput}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full pl-10 pr-10 py-3 bg-gray-50 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
        />
        {searchInput && (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full bg-gray-300 text-white hover:bg-gray-400 transition-colors"
            aria-label="Clear search"
          >
            <X size={11} strokeWidth={3} />
          </button>
        )}
      </div>

      {/* Filter chips with count badges */}
      <div className="flex gap-2 mb-5">
        {(
          [
            { label: "All", value: "all" as FilterType, count: counts?.all },
            {
              label: "Income",
              value: "income" as FilterType,
              count: counts?.income,
            },
            {
              label: "Expense",
              value: "expense" as FilterType,
              count: counts?.expense,
            },
          ] as const
        ).map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              filter === f.value
                ? "bg-emerald-500 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {f.label}
            {f.count !== undefined && (
              <span
                className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center leading-none ${
                  filter === f.value
                    ? "bg-white/25 text-white"
                    : "bg-gray-200 text-gray-500"
                }`}
              >
                {f.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Transaction list */}
      {loading ? (
        <div className="space-y-4 animate-pulse">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl"
            >
              <div className="w-10 h-10 bg-gray-200 rounded-full" />
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-24 mb-2" />
                <div className="h-3 bg-gray-100 rounded w-16" />
              </div>
              <div className="h-4 bg-gray-200 rounded w-16" />
            </div>
          ))}
        </div>
      ) : transactions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Receipt size={48} className="text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 mb-2">
            No transactions found
          </h3>
          <p className="text-sm text-gray-400">
            {search || filter !== "all"
              ? "Try adjusting your filters or search term."
              : "Tap the + button to add your first transaction."}
          </p>
        </div>
      ) : (
        <div>
          {Object.entries(grouped).map(([dateLabel, items]) => {
            // ── Improvement #1: Daily subtotals ──
            const dayIncome = items
              .filter((t) => t.type === "income")
              .reduce((s, t) => s + t.amount, 0);
            const dayExpense = items
              .filter((t) => t.type === "expense")
              .reduce((s, t) => s + t.amount, 0);
            const dayNet = dayIncome - dayExpense;

            return (
              <div
                key={dateLabel}
                className={cn(
                  "mb-5",
                  transactions.length > 30 && "content-visibility-auto",
                )}
              >
                {/* Date header with net total */}
                <div className="flex items-center justify-between mb-2 px-1">
                  <h3 className="text-sm font-semibold text-gray-500">
                    {dateLabel}
                  </h3>
                  <span
                    className={`text-xs font-bold ${dayNet >= 0 ? "text-emerald-500" : "text-red-500"}`}
                  >
                    {dayNet >= 0 ? "+" : ""}
                    {formatCurrency(dayNet)}
                  </span>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50 shadow-sm">
                  {items.map((t) => (
                    // ── Improvement #2: Tappable → detail sheet, #8: Swipe-to-delete ──
                    <TransactionItem
                      key={t.id}
                      id={t.id}
                      categoryName={t.categories?.name ?? "Unknown"}
                      categoryIcon={t.categories?.icon ?? "Package"}
                      categoryColor={t.categories?.color ?? "#6B7280"}
                      categoryScope={t.categories?.scope}
                      accountName={t.accounts?.name}
                      note={t.note}
                      amount={t.amount}
                      type={t.type}
                      date={t.transaction_date}
                      isPending={t.isPending}
                      isSettled={t.is_settled}
                      onClick={() => setSelectedTx(t)}
                      onSwipeDelete={() => handleSwipeDelete(t.id)}
                    />
                  ))}
                </div>
              </div>
            );
          })}

          {/* Infinite scroll sentinel */}
          {hasMore && (
            <div ref={observerRef} className="flex justify-center py-4">
              {loadingMore && (
                <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Improvement #2: Detail bottom sheet ── */}
      <TransactionDetailSheet
        isOpen={!!selectedTx}
        onClose={() => setSelectedTx(null)}
        onDelete={handleDetailDelete}
        onSettle={handleDetailSettle}
        transaction={
          selectedTx
            ? {
                id: selectedTx.id,
                type: selectedTx.type,
                amount: selectedTx.amount,
                note: selectedTx.note,
                transaction_date: selectedTx.transaction_date,
                is_settled: selectedTx.is_settled,
                categories: selectedTx.categories
                  ? {
                      name: selectedTx.categories.name,
                      icon: selectedTx.categories.icon,
                      color: selectedTx.categories.color,
                      scope: selectedTx.categories.scope,
                    }
                  : null,
                accounts: selectedTx.accounts
                  ? { name: selectedTx.accounts.name }
                  : null,
              }
            : null
        }
      />
    </div>
  );
}

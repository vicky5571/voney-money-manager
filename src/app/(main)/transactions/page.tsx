'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getTransactions } from '@/app/actions/transactions';
import { TransactionItem } from '@/components/transaction-item';
import { Search, SlidersHorizontal } from 'lucide-react';
import { formatDate } from '@/lib/utils';

type Transaction = {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  note: string | null;
  transaction_date: string;
  created_at: string;
  categories: { id: string; name: string; icon: string; color: string } | null;
  accounts: { id: string; name: string } | null;
};

type FilterType = 'all' | 'income' | 'expense';

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const observerRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const loadMoreTransactions = useCallback(async (pageNum: number) => {
    try {
      setLoadingMore(true);
      const result = await getTransactions({
        page: pageNum,
        limit: 20,
        type: filter === 'all' ? undefined : filter,
        search: search || undefined,
      });

      const rawList = (result.transactions ?? []) as unknown as Record<string, unknown>[];
      const txns: Transaction[] = rawList.map((t) => {
        const cat = Array.isArray(t.categories) ? t.categories[0] : t.categories;
        const acc = Array.isArray(t.accounts) ? t.accounts[0] : t.accounts;
        return {
          id: String(t.id),
          type: t.type as 'income' | 'expense',
          amount: Number(t.amount),
          note: t.note ? String(t.note) : null,
          transaction_date: String(t.transaction_date),
          created_at: String(t.created_at),
          categories: cat ? {
            id: String(cat.id),
            name: String(cat.name),
            icon: String(cat.icon),
            color: String(cat.color),
          } : null,
          accounts: acc ? {
            id: String(acc.id),
            name: String(acc.name),
          } : null,
        };
      });

      setTransactions((prev) => [...prev, ...txns]);
      setHasMore(result.hasMore);
    } catch {
      console.error('Failed to load more transactions');
    } finally {
      setLoadingMore(false);
    }
  }, [filter, search]);

  // Initial load and filter/search changes
  useEffect(() => {
    let ignore = false;
    async function loadInitial() {
      try {
        const result = await getTransactions({
          page: 1,
          limit: 20,
          type: filter === 'all' ? undefined : filter,
          search: search || undefined,
        });

        if (ignore) return;

        const rawList = (result.transactions ?? []) as unknown as Record<string, unknown>[];
        const txns: Transaction[] = rawList.map((t) => {
          const cat = Array.isArray(t.categories) ? t.categories[0] : t.categories;
          const acc = Array.isArray(t.accounts) ? t.accounts[0] : t.accounts;
          return {
            id: String(t.id),
            type: t.type as 'income' | 'expense',
            amount: Number(t.amount),
            note: t.note ? String(t.note) : null,
            transaction_date: String(t.transaction_date),
            created_at: String(t.created_at),
            categories: cat ? {
              id: String(cat.id),
              name: String(cat.name),
              icon: String(cat.icon),
              color: String(cat.color),
            } : null,
            accounts: acc ? {
              id: String(acc.id),
              name: String(acc.name),
            } : null,
          };
        });

        setTransactions(txns);
        setHasMore(result.hasMore);
        setPage(1);
      } catch {
        console.error('Failed to fetch transactions');
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadInitial();
    return () => {
      ignore = true;
    };
  }, [filter, search]);

  // Infinite scroll
  useEffect(() => {
    if (!observerRef.current || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          const nextPage = page + 1;
          setPage(nextPage);
          loadMoreTransactions(nextPage);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(observerRef.current);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, page, loadMoreTransactions]);

  // Debounced search
  const handleSearch = (value: string) => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setSearch(value);
    }, 300);
  };

  // Group transactions by date
  const groupedTransactions = transactions.reduce<Record<string, Transaction[]>>((groups, t) => {
    const dateKey = formatDate(t.transaction_date);
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(t);
    return groups;
  }, {});

  const filters: { label: string; value: FilterType }[] = [
    { label: 'All', value: 'all' },
    { label: 'Income', value: 'income' },
    { label: 'Expense', value: 'expense' },
  ];

  return (
    <div className="px-4 pt-6">
      {/* Top Header */}
      <h1 className="text-2xl font-bold mb-4">Transactions</h1>

      {/* Search bar */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input
          type="text"
          placeholder="Search transactions..."
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-gray-50 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 mb-6">
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              filter === f.value
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Transaction list */}
      {loading ? (
        <div className="space-y-4 animate-pulse">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
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
          <SlidersHorizontal size={48} className="text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 mb-2">No transactions found</h3>
          <p className="text-sm text-gray-400">
            {search || filter !== 'all'
              ? 'Try adjusting your filters or search term.'
              : 'Tap the + button to add your first transaction.'}
          </p>
        </div>
      ) : (
        <div>
          {Object.entries(groupedTransactions).map(([dateLabel, items]) => (
            <div key={dateLabel} className="mb-6">
              <h3 className="text-sm font-semibold text-gray-500 mb-2 px-1">
                {dateLabel}
              </h3>
              <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50 shadow-sm">
                {items.map((t) => (
                  <TransactionItem
                    key={t.id}
                    id={t.id}
                    categoryName={t.categories?.name ?? 'Unknown'}
                    categoryIcon={t.categories?.icon ?? 'Package'}
                    categoryColor={t.categories?.color ?? '#6B7280'}
                    note={t.note}
                    amount={Number(t.amount)}
                    type={t.type}
                    date={t.transaction_date}
                  />
                ))}
              </div>
            </div>
          ))}

          {/* Infinite scroll sentinel */}
          {hasMore && (
            <div ref={observerRef} className="flex justify-center py-4">
              {loadingMore && (
                <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

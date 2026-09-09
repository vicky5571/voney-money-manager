'use client';

import { create } from 'zustand';
import type { FinancialHealthResult } from '@/lib/financial-health';
import { getMonthKeyFromDateString } from '@/lib/utils';

export interface CachedTransaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  note: string | null;
  transaction_date: string;
  created_at: string;
  isPending?: boolean;
  is_settled?: boolean;
  categories: { id?: string; name: string; icon: string; color: string; scope?: string } | null;
  accounts: { id?: string; name: string } | null;
}

export interface CachedMonthSummary {
  income: number;
  expense: number;
  net: number;
}

export interface CachedCounts {
  all: number;
  income: number;
  expense: number;
}

export interface RehydratedOfflineTx {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  category_id: string;
  account_id: string;
  transaction_date: string;
  note?: string;
  is_settled?: boolean;
  created_at_local?: string;
  category_name?: string;
  category_icon?: string;
  category_color?: string;
  category_scope?: string;
  account_name?: string;
}

export interface RehydratedOfflineTransfer {
  id: string;
  from_account_id: string;
  to_account_id: string;
  amount: number;
  transaction_date: string;
  note?: string;
  created_at_local?: string;
  from_account_name?: string;
  to_account_name?: string;
}

interface AppStoreState {
  // Transactions cache keyed by "month-year"
  txCache: Record<string, CachedTransaction[]>;
  summaryCache: Record<string, CachedMonthSummary>;
  healthCache: Record<string, FinancialHealthResult>;
  countsCache: Record<string, CachedCounts>;
  
  // Dashboard fast cache
  dashboardTotalBalance: number | null;
  dashboardIncome: number | null;
  dashboardExpense: number | null;

  // Actions
  setTransactionsForMonth: (key: string, txs: CachedTransaction[]) => void;
  setSummaryForMonth: (key: string, summary: CachedMonthSummary) => void;
  setHealthForMonth: (key: string, health: FinancialHealthResult) => void;
  setCountsForMonth: (key: string, counts: CachedCounts) => void;
  setDashboardCache: (balance: number, income: number, expense: number) => void;
  
  // Optimistic Mutations
  optimisticAddTransaction: (
    tx: Omit<CachedTransaction, 'id' | 'created_at'> & { id?: string; created_at?: string; isPending?: boolean }
  ) => void;
  optimisticAddTransfer: (params: {
    id: string;
    fromAccount: { id: string; name: string };
    toAccount: { id: string; name: string };
    amount: number;
    transaction_date: string;
    note?: string | null;
  }) => void;
  markTransactionSynced: (tempId: string, realId?: string) => void;
  optimisticSettleTransaction: (id: string, amount: number, type: 'income' | 'expense') => void;
  optimisticDeleteTransaction: (id: string, monthKey: string) => void;
  optimisticDeleteTransfer: (transferId: string, monthKey: string) => void;
  rehydrateOfflineQueue: (
    txQueue: RehydratedOfflineTx[],
    trQueue?: RehydratedOfflineTransfer[]
  ) => void;
}

export const useAppStore = create<AppStoreState>((set) => ({
  txCache: {},
  summaryCache: {},
  healthCache: {},
  countsCache: {},

  dashboardTotalBalance: null,
  dashboardIncome: null,
  dashboardExpense: null,

  setTransactionsForMonth: (key, txs) =>
    set((state) => ({ txCache: { ...state.txCache, [key]: txs } })),

  setSummaryForMonth: (key, summary) =>
    set((state) => ({ summaryCache: { ...state.summaryCache, [key]: summary } })),

  setHealthForMonth: (key, health) =>
    set((state) => ({ healthCache: { ...state.healthCache, [key]: health } })),

  setCountsForMonth: (key, counts) =>
    set((state) => ({ countsCache: { ...state.countsCache, [key]: counts } })),

  setDashboardCache: (balance, income, expense) =>
    set({
      dashboardTotalBalance: balance,
      dashboardIncome: income,
      dashboardExpense: expense,
    }),

  optimisticAddTransaction: (tx) =>
    set((state) => {
      const key = getMonthKeyFromDateString(tx.transaction_date);
      const currentList = state.txCache[key] || [];
      const isSettled = tx.is_settled ?? true;

      const fullTx: CachedTransaction = {
        ...tx,
        id: tx.id || `temp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        created_at: tx.created_at || new Date().toISOString(),
        isPending: tx.isPending !== undefined ? tx.isPending : true,
        is_settled: isSettled,
      };

      // Prepend transaction
      const updatedList = [fullTx, ...currentList.filter((t) => t.id !== fullTx.id)];

      // Update summary
      const currentSummary = state.summaryCache[key] || { income: 0, expense: 0, net: 0 };
      const newIncome = tx.type === 'income' ? currentSummary.income + tx.amount : currentSummary.income;
      const newExpense = tx.type === 'expense' ? currentSummary.expense + tx.amount : currentSummary.expense;

      // Update dashboard cache if settled
      const currentBalance = state.dashboardTotalBalance ?? 0;
      const newBalance = isSettled
        ? (tx.type === 'income' ? currentBalance + tx.amount : currentBalance - tx.amount)
        : currentBalance;

      // Only update dashboard monthly income/expense if transaction is in the current month
      const now = new Date();
      const currentMonthKey = `${now.getMonth() + 1}-${now.getFullYear()}`;
      const isCurrentMonth = key === currentMonthKey;

      return {
        txCache: { ...state.txCache, [key]: updatedList },
        summaryCache: {
          ...state.summaryCache,
          [key]: { income: newIncome, expense: newExpense, net: newIncome - newExpense },
        },
        dashboardTotalBalance: newBalance,
        dashboardIncome: isCurrentMonth && state.dashboardIncome !== null
          ? state.dashboardIncome + (tx.type === 'income' ? tx.amount : 0)
          : state.dashboardIncome,
        dashboardExpense: isCurrentMonth && state.dashboardExpense !== null
          ? state.dashboardExpense + (tx.type === 'expense' ? tx.amount : 0)
          : state.dashboardExpense,
      };
    }),

  optimisticAddTransfer: (params) =>
    set((state) => {
      const key = getMonthKeyFromDateString(params.transaction_date);
      const currentList = state.txCache[key] || [];

      const transferCategory = {
        name: "Transfer",
        icon: "ArrowRightLeft",
        color: "#14B8A6",
      };

      const outNote = params.note
        ? `Transfer to ${params.toAccount.name}: ${params.note}`
        : `Transfer to ${params.toAccount.name}`;

      const inNote = params.note
        ? `Transfer from ${params.fromAccount.name}: ${params.note}`
        : `Transfer from ${params.fromAccount.name}`;

      const nowIso = new Date().toISOString();

      const outTx: CachedTransaction = {
        id: `${params.id}_out`,
        type: "expense",
        amount: params.amount,
        note: outNote,
        transaction_date: params.transaction_date,
        created_at: nowIso,
        isPending: true,
        is_settled: true,
        categories: transferCategory,
        accounts: { id: params.fromAccount.id, name: params.fromAccount.name },
      };

      const inTx: CachedTransaction = {
        id: `${params.id}_in`,
        type: "income",
        amount: params.amount,
        note: inNote,
        transaction_date: params.transaction_date,
        created_at: nowIso,
        isPending: true,
        is_settled: true,
        categories: transferCategory,
        accounts: { id: params.toAccount.id, name: params.toAccount.name },
      };

      // Add both to month cache (transfers do not change totalBalance or monthly expense/income summary)
      const updatedList = [
        outTx,
        inTx,
        ...currentList.filter(
          (t) => t.id !== outTx.id && t.id !== inTx.id && t.id !== params.id
        ),
      ];

      return {
        txCache: { ...state.txCache, [key]: updatedList },
      };
    }),

  markTransactionSynced: (tempId, realId) =>
    set((state) => {
      const newTxCache: Record<string, CachedTransaction[]> = {};
      let changed = false;

      for (const [key, list] of Object.entries(state.txCache)) {
        const updated = list.map((t) => {
          if (
            t.id === tempId ||
            t.id === `${tempId}_out` ||
            t.id === `${tempId}_in`
          ) {
            changed = true;
            return {
              ...t,
              id: realId && t.id === tempId ? realId : t.id,
              isPending: false,
            };
          }
          return t;
        });
        newTxCache[key] = updated;
      }

      if (!changed) return state;
      return { txCache: newTxCache };
    }),

  optimisticSettleTransaction: (id, amount, type) =>
    set((state) => {
      const newTxCache: Record<string, CachedTransaction[]> = {};
      let changed = false;

      for (const [key, list] of Object.entries(state.txCache)) {
        const updated = list.map((t) => {
          if (t.id === id) {
            changed = true;
            return {
              ...t,
              is_settled: true,
            };
          }
          return t;
        });
        newTxCache[key] = updated;
      }

      const currentBalance = state.dashboardTotalBalance ?? 0;
      const newBalance = type === 'income' ? currentBalance + amount : currentBalance - amount;

      return {
        txCache: changed ? newTxCache : state.txCache,
        dashboardTotalBalance: changed ? newBalance : state.dashboardTotalBalance,
      };
    }),

  optimisticDeleteTransaction: (id, monthKey) =>
    set((state) => {
      const currentList = state.txCache[monthKey] || [];
      const tx = currentList.find((t) => t.id === id);
      const updatedList = currentList.filter((t) => t.id !== id);

      if (!tx) {
        return { txCache: { ...state.txCache, [monthKey]: updatedList } };
      }

      const currentSummary = state.summaryCache[monthKey] || { income: 0, expense: 0, net: 0 };
      const newIncome = tx.type === 'income' ? Math.max(0, currentSummary.income - tx.amount) : currentSummary.income;
      const newExpense = tx.type === 'expense' ? Math.max(0, currentSummary.expense - tx.amount) : currentSummary.expense;

      const currentBalance = state.dashboardTotalBalance;
      const isSettled = tx.is_settled ?? true;
      const newBalance = currentBalance !== null
        ? (isSettled ? (tx.type === 'income' ? currentBalance - tx.amount : currentBalance + tx.amount) : currentBalance)
        : null;

      const now = new Date();
      const currentMonthKey = `${now.getMonth() + 1}-${now.getFullYear()}`;
      const isCurrentMonth = monthKey === currentMonthKey;

      const newDashIncome = isCurrentMonth && state.dashboardIncome !== null
        ? (tx.type === 'income' ? Math.max(0, state.dashboardIncome - tx.amount) : state.dashboardIncome)
        : state.dashboardIncome;

      const newDashExpense = isCurrentMonth && state.dashboardExpense !== null
        ? (tx.type === 'expense' ? Math.max(0, state.dashboardExpense - tx.amount) : state.dashboardExpense)
        : state.dashboardExpense;

      return {
        txCache: { ...state.txCache, [monthKey]: updatedList },
        summaryCache: {
          ...state.summaryCache,
          [monthKey]: { income: newIncome, expense: newExpense, net: newIncome - newExpense },
        },
        dashboardTotalBalance: newBalance,
        dashboardIncome: newDashIncome,
        dashboardExpense: newDashExpense,
      };
    }),

  optimisticDeleteTransfer: (transferId, monthKey) =>
    set((state) => {
      const currentList = state.txCache[monthKey] || [];
      const updatedList = currentList.filter(
        (t) =>
          t.id !== transferId &&
          t.id !== `${transferId}_out` &&
          t.id !== `${transferId}_in`
      );
      return {
        txCache: { ...state.txCache, [monthKey]: updatedList },
      };
    }),

  rehydrateOfflineQueue: (txQueue, trQueue = []) =>
    set((state) => {
      if (txQueue.length === 0 && trQueue.length === 0) return state;

      const newTxCache = { ...state.txCache };
      let hasChanges = false;

      // 1. Rehydrate regular transactions
      for (const item of txQueue) {
        const monthKey = getMonthKeyFromDateString(item.transaction_date);
        const currentList = newTxCache[monthKey] || [];
        const exists = currentList.some((t) => t.id === item.id);
        if (!exists) {
          hasChanges = true;
          const isSettled = item.is_settled ?? true;
          const rehydratedTx: CachedTransaction = {
            id: item.id,
            type: item.type,
            amount: item.amount,
            note: item.note || null,
            transaction_date: item.transaction_date,
            created_at: item.created_at_local || new Date().toISOString(),
            isPending: true,
            is_settled: isSettled,
            categories: item.category_name
              ? {
                  id: item.category_id,
                  name: item.category_name,
                  icon: item.category_icon || 'Package',
                  color: item.category_color || '#6B7280',
                  scope: item.category_scope,
                }
              : {
                  id: item.category_id,
                  name: 'Transaction',
                  icon: 'Package',
                  color: '#6B7280',
                  scope: item.category_scope,
                },
            accounts: item.account_name
              ? { id: item.account_id, name: item.account_name }
              : { id: item.account_id, name: 'Account' },
          };
          newTxCache[monthKey] = [rehydratedTx, ...currentList];
        }
      }

      // 2. Rehydrate transfers
      for (const tr of trQueue) {
        const monthKey = getMonthKeyFromDateString(tr.transaction_date);
        const currentList = newTxCache[monthKey] || [];
        const outId = `${tr.id}_out`;
        const inId = `${tr.id}_in`;
        const exists = currentList.some(
          (t) => t.id === outId || t.id === inId || t.id === tr.id
        );

        if (!exists) {
          hasChanges = true;
          const transferCategory = {
            name: 'Transfer',
            icon: 'ArrowRightLeft',
            color: '#14B8A6',
          };
          const fromName = tr.from_account_name || 'Account';
          const toName = tr.to_account_name || 'Account';
          const outNote = tr.note
            ? `Transfer to ${toName}: ${tr.note}`
            : `Transfer to ${toName}`;
          const inNote = tr.note
            ? `Transfer from ${fromName}: ${tr.note}`
            : `Transfer from ${fromName}`;

          const nowIso = tr.created_at_local || new Date().toISOString();

          const outTx: CachedTransaction = {
            id: outId,
            type: 'expense',
            amount: tr.amount,
            note: outNote,
            transaction_date: tr.transaction_date,
            created_at: nowIso,
            isPending: true,
            is_settled: true,
            categories: transferCategory,
            accounts: { id: tr.from_account_id, name: fromName },
          };

          const inTx: CachedTransaction = {
            id: inId,
            type: 'income',
            amount: tr.amount,
            note: inNote,
            transaction_date: tr.transaction_date,
            created_at: nowIso,
            isPending: true,
            is_settled: true,
            categories: transferCategory,
            accounts: { id: tr.to_account_id, name: toName },
          };

          newTxCache[monthKey] = [outTx, inTx, ...currentList];
        }
      }

      if (!hasChanges) return state;
      return { txCache: newTxCache };
    }),
}));

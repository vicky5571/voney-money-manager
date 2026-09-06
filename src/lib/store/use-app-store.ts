'use client';

import { create } from 'zustand';
import type { FinancialHealthResult } from '@/lib/financial-health';

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
      const date = new Date(tx.transaction_date);
      const key = `${date.getMonth() + 1}-${date.getFullYear()}`;
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

      return {
        txCache: { ...state.txCache, [key]: updatedList },
        summaryCache: {
          ...state.summaryCache,
          [key]: { income: newIncome, expense: newExpense, net: newIncome - newExpense },
        },
        dashboardTotalBalance: newBalance,
        dashboardIncome: (state.dashboardIncome ?? 0) + (tx.type === 'income' ? tx.amount : 0),
        dashboardExpense: (state.dashboardExpense ?? 0) + (tx.type === 'expense' ? tx.amount : 0),
      };
    }),

  optimisticAddTransfer: (params) =>
    set((state) => {
      const date = new Date(params.transaction_date);
      const key = `${date.getMonth() + 1}-${date.getFullYear()}`;
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

      const newDashIncome = state.dashboardIncome !== null
        ? (tx.type === 'income' ? Math.max(0, state.dashboardIncome - tx.amount) : state.dashboardIncome)
        : null;

      const newDashExpense = state.dashboardExpense !== null
        ? (tx.type === 'expense' ? Math.max(0, state.dashboardExpense - tx.amount) : state.dashboardExpense)
        : null;

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
}));

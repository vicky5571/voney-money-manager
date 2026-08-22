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
  categories: { id: string; name: string; icon: string; color: string } | null;
  accounts: { id: string; name: string } | null;
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
    tx: Omit<CachedTransaction, 'id' | 'created_at'> & { id?: string; created_at?: string }
  ) => void;
  optimisticDeleteTransaction: (id: string, monthKey: string) => void;
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

      const fullTx: CachedTransaction = {
        ...tx,
        id: tx.id || `temp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        created_at: tx.created_at || new Date().toISOString(),
      };

      // Prepend transaction
      const updatedList = [fullTx, ...currentList.filter((t) => t.id !== fullTx.id)];

      // Update summary
      const currentSummary = state.summaryCache[key] || { income: 0, expense: 0, net: 0 };
      const newIncome = tx.type === 'income' ? currentSummary.income + tx.amount : currentSummary.income;
      const newExpense = tx.type === 'expense' ? currentSummary.expense + tx.amount : currentSummary.expense;

      // Update dashboard cache
      const currentBalance = state.dashboardTotalBalance ?? 0;
      const newBalance = tx.type === 'income' ? currentBalance + tx.amount : currentBalance - tx.amount;

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

      return {
        txCache: { ...state.txCache, [monthKey]: updatedList },
        summaryCache: {
          ...state.summaryCache,
          [monthKey]: { income: newIncome, expense: newExpense, net: newIncome - newExpense },
        },
      };
    }),
}));

'use client';

import { useState } from 'react';
import { formatCurrency } from '@/lib/utils';
import { Eye, EyeOff } from 'lucide-react';

interface BalanceCardProps {
  totalBalance: number;
  income: number;
  expense: number;
}

export function BalanceCard({ totalBalance, income, expense }: BalanceCardProps) {
  const [showBalance, setShowBalance] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.localStorage.getItem('voney:show-balance') !== 'false';
  });

  const toggleBalance = () => {
    setShowBalance((visible) => {
      const nextVisible = !visible;
      window.localStorage.setItem('voney:show-balance', String(nextVisible));
      return nextVisible;
    });
  };

  const maskValue = (value: number) => {
    return showBalance ? formatCurrency(value) : '••••••••';
  };

  return (
    <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-2xl p-6 text-white shadow-md">
      <div className="flex items-center justify-between text-indigo-100 text-sm font-medium mb-1">
        <span>Total balance</span>
        <button
          type="button"
          onClick={toggleBalance}
          className="min-h-[44px] min-w-[44px] px-2.5 py-1 -mr-2 hover:bg-white/10 rounded-lg transition-colors flex items-center gap-1.5 text-xs text-indigo-100 font-medium"
          aria-label={showBalance ? 'Hide balance' : 'Show balance'}
        >
          {showBalance ? <EyeOff size={16} /> : <Eye size={16} />}
          <span className="text-xs">{showBalance ? 'Hide' : 'Show'}</span>
        </button>
      </div>

      <div className="text-3xl font-bold mb-5 tracking-tight">
        {maskValue(totalBalance)}
      </div>

      {/* Monthly Summary Header with Badge */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-200">
          Monthly Cash Flow
        </span>
        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/20 text-white backdrop-blur-sm">
          This Month
        </span>
      </div>
      
      <div className="flex gap-3">
        {/* Income Pill */}
        <div className="flex-1 bg-white/10 backdrop-blur rounded-xl px-3 py-2.5 flex items-center gap-2.5 border border-white/10">
          <div className="w-8 h-8 rounded-full bg-emerald-400/20 flex items-center justify-center shrink-0">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
          </div>
          <div className="overflow-hidden min-w-0">
            <div className="text-[11px] font-medium text-indigo-100">Income</div>
            <div className="text-sm font-bold truncate text-white">{maskValue(income)}</div>
          </div>
        </div>
        
        {/* Expense Pill */}
        <div className="flex-1 bg-white/10 backdrop-blur rounded-xl px-3 py-2.5 flex items-center gap-2.5 border border-white/10">
          <div className="w-8 h-8 rounded-full bg-red-400/20 flex items-center justify-center shrink-0">
            <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
          </div>
          <div className="overflow-hidden min-w-0">
            <div className="text-[11px] font-medium text-indigo-100">Expense</div>
            <div className="text-sm font-bold truncate text-white">{maskValue(expense)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

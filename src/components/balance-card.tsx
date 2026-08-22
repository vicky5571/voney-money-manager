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
  const [showBalance, setShowBalance] = useState(true);

  const maskValue = (value: number) => {
    return showBalance ? formatCurrency(value) : '••••••••';
  };

  return (
    <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-2xl p-6 text-white shadow-md">
      <div className="flex items-center justify-between text-indigo-200 text-sm font-medium mb-1">
        <span>Total balance</span>
        <button
          type="button"
          onClick={() => setShowBalance(!showBalance)}
          className="p-1 hover:bg-white/10 rounded-lg transition-colors flex items-center gap-1.5 text-xs text-indigo-200"
          aria-label={showBalance ? 'Hide balance' : 'Show balance'}
        >
          {showBalance ? <EyeOff size={16} /> : <Eye size={16} />}
          <span className="text-[11px]">{showBalance ? 'Hide' : 'Show'}</span>
        </button>
      </div>

      <div className="text-3xl font-bold mb-6 tracking-tight">
        {maskValue(totalBalance)}
      </div>
      
      <div className="flex gap-4">
        {/* Income Pill */}
        <div className="flex-1 bg-white/10 backdrop-blur rounded-xl px-3 py-2 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
            <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
          </div>
          <div className="overflow-hidden">
            <div className="text-xs text-indigo-100">Income</div>
            <div className="text-sm font-semibold truncate">{maskValue(income)}</div>
          </div>
        </div>
        
        {/* Expense Pill */}
        <div className="flex-1 bg-white/10 backdrop-blur rounded-xl px-3 py-2 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
            <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
          </div>
          <div className="overflow-hidden">
            <div className="text-xs text-indigo-100">Expense</div>
            <div className="text-sm font-semibold truncate">{maskValue(expense)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}


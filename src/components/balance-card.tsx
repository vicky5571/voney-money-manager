import { formatCurrency } from '@/lib/utils';

interface BalanceCardProps {
  totalBalance: number;
  income: number;
  expense: number;
}

export function BalanceCard({ totalBalance, income, expense }: BalanceCardProps) {
  return (
    <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-2xl p-6 text-white shadow-md">
      <div className="text-indigo-200 text-sm font-medium mb-1">Total balance</div>
      <div className="text-3xl font-bold mb-6">{formatCurrency(totalBalance)}</div>
      
      <div className="flex gap-4">
        {/* Income Pill */}
        <div className="flex-1 bg-white/10 backdrop-blur rounded-xl px-3 py-2 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
            <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
          </div>
          <div className="overflow-hidden">
            <div className="text-xs text-indigo-100">Income</div>
            <div className="text-sm font-semibold truncate">{formatCurrency(income)}</div>
          </div>
        </div>
        
        {/* Expense Pill */}
        <div className="flex-1 bg-white/10 backdrop-blur rounded-xl px-3 py-2 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
            <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
          </div>
          <div className="overflow-hidden">
            <div className="text-xs text-indigo-100">Expense</div>
            <div className="text-sm font-semibold truncate">{formatCurrency(expense)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

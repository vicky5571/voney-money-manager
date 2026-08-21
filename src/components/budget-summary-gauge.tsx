import { formatCurrency } from '@/lib/utils';
import { AlertTriangle, Plus } from 'lucide-react';

interface BudgetSummaryGaugeProps {
  totalBudget: number;
  totalSpent: number;
  daysLeft: number;
  onAddBudget: () => void;
}

export function BudgetSummaryGauge({
  totalBudget,
  totalSpent,
  daysLeft,
  onAddBudget,
}: BudgetSummaryGaugeProps) {
  const remaining = totalBudget - totalSpent;
  const amountYouCanSpend = Math.max(0, remaining);
  const isOverBudget = totalSpent > totalBudget && totalBudget > 0;

  // Percentage of budget remaining (0 to 100)
  const remainingPercentage = totalBudget > 0
    ? Math.max(0, Math.min(100, (remaining / totalBudget) * 100))
    : 0;

  // Semi-circle arc circumference: C = pi * r = pi * 92 ~= 289.027
  const arcLength = 289.027;
  const strokeDashoffset = arcLength * (1 - remainingPercentage / 100);

  // Dynamic progress color based on remaining budget health
  let strokeColor = '#22C55E'; // Green-500 (Healthy)
  if (isOverBudget || remainingPercentage < 15) {
    strokeColor = '#EF4444'; // Red-500 (Critical / Over)
  } else if (remainingPercentage < 35) {
    strokeColor = '#F59E0B'; // Amber-500 (Warning)
  }

  return (
    <div className="w-full bg-white rounded-3xl p-5 shadow-sm border border-gray-100 space-y-4">
      {/* Half Circle Gauge Section */}
      <div className="relative flex flex-col items-center justify-center pt-2">
        <svg
          viewBox="0 0 200 120"
          className="w-72 h-44 sm:w-80 sm:h-48 overflow-visible"
        >
          {/* Background Track Arc */}
          <path
            d="M 8 105 A 92 92 0 0 1 192 105"
            fill="none"
            stroke="#F3F4F6"
            strokeWidth="8"
            strokeLinecap="round"
          />

          {/* Progress Remaining Arc */}
          {totalBudget > 0 && (
            <path
              d="M 8 105 A 92 92 0 0 1 192 105"
              fill="none"
              stroke={strokeColor}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={arcLength}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-700 ease-out"
            />
          )}
        </svg>

        {/* Center Text Information */}
        <div className="absolute top-20 flex flex-col items-center text-center px-4">
          <div className="flex items-center gap-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
            <span>Amount you can spend</span>
          </div>

          <span
            className={`text-2xl sm:text-3xl font-black mt-1 tracking-tight ${
              isOverBudget ? 'text-red-600' : 'text-gray-900'
            }`}
          >
            {formatCurrency(amountYouCanSpend)}
          </span>

          {isOverBudget ? (
            <div className="flex items-center gap-1 text-[11px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full mt-1">
              <AlertTriangle size={12} />
              <span>Over budget by {formatCurrency(Math.abs(remaining))}</span>
            </div>
          ) : totalBudget > 0 ? (
            <span className="text-[11px] font-semibold text-gray-500 mt-0.5">
              {remainingPercentage.toFixed(0)}% of total budget available
            </span>
          ) : (
            <span className="text-[11px] text-gray-400 mt-0.5">No budget set</span>
          )}
        </div>
      </div>

      {/* 3-Column Summary Stats */}
      <div className="grid grid-cols-3 gap-2 pt-3 border-t border-gray-100 text-center">
        <div className="bg-gray-50/80 p-2.5 rounded-2xl">
          <span className="text-[10px] text-gray-400 uppercase font-semibold block">Total Budgets</span>
          <p className="text-xs font-bold text-gray-900 mt-0.5">{formatCurrency(totalBudget)}</p>
        </div>

        <div className="bg-gray-50/80 p-2.5 rounded-2xl">
          <span className="text-[10px] text-gray-400 uppercase font-semibold block">Total Spent</span>
          <p className="text-xs font-bold text-gray-900 mt-0.5">{formatCurrency(totalSpent)}</p>
        </div>

        <div className="bg-gray-50/80 p-2.5 rounded-2xl">
          <span className="text-[10px] text-gray-400 uppercase font-semibold block">Days Left</span>
          <p className="text-xs font-bold text-gray-900 mt-0.5">{daysLeft} days</p>
        </div>
      </div>

      {/* Create Budget Button */}
      <button
        onClick={onAddBudget}
        className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 text-white rounded-2xl text-sm font-semibold hover:bg-indigo-700 active:scale-[0.98] transition-all shadow-sm"
      >
        <Plus size={16} />
        Create Budget
      </button>
    </div>
  );
}

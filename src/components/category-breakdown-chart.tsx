'use client';

import { useState } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { formatCurrency } from '@/lib/utils';
import { CategoryIcon } from '@/constants/categories';
import { TrendingDown, TrendingUp, PieChart as PieChartIcon } from 'lucide-react';

export interface CategorySpendingItem {
  name: string;
  amount: number;
  percentage: number;
  color: string;
  icon: string;
}

export interface MonthOverMonthComparison {
  lastMonthTotal: number;
  diffPercentage: number | null;
  isLower: boolean;
}

interface CategoryBreakdownChartProps {
  data: CategorySpendingItem[];
  totalExpense: number;
  momComparison?: MonthOverMonthComparison | null;
}

export function CategoryBreakdownChart({
  data,
  totalExpense,
  momComparison,
}: CategoryBreakdownChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  if (!data || data.length === 0 || totalExpense === 0) {
    return null;
  }

  const activeCategory = activeIndex !== null ? data[activeIndex] : null;

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-500 flex items-center justify-center">
            <PieChartIcon size={15} />
          </div>
          <div>
            <h2 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
              Category Breakdown
            </h2>
          </div>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
          This Month
        </span>
      </div>

      {/* Month-over-Month Comparison Pill */}
      {momComparison && momComparison.diffPercentage !== null && (
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 border border-gray-100 text-xs">
          <div className="flex items-center gap-2">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                momComparison.isLower
                  ? 'bg-emerald-100 text-emerald-500'
                  : 'bg-amber-100 text-amber-700'
              }`}
            >
              {momComparison.isLower ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
            </div>
            <span className="font-medium text-gray-700">
              {momComparison.isLower
                ? `${Math.abs(momComparison.diffPercentage)}% less spending than last month`
                : `${momComparison.diffPercentage}% higher spending than last month`}
            </span>
          </div>
          <span className="text-[11px] text-gray-600 font-semibold">
            Prev: {formatCurrency(momComparison.lastMonthTotal)}
          </span>
        </div>
      )}

      {/* Donut Chart */}
      <div className="relative h-44 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const p = payload[0].payload as CategorySpendingItem;
                  return (
                    <div className="bg-gray-900 text-white px-2.5 py-1.5 rounded-lg text-xs shadow-lg">
                      <span className="font-semibold">{p.name}: </span>
                      <span>{formatCurrency(p.amount)} ({p.percentage}%)</span>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Pie
              data={data}
              dataKey="amount"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={52}
              outerRadius={74}
              paddingAngle={3}
              onMouseEnter={(_, index) => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color}
                  opacity={activeIndex === null || activeIndex === index ? 1 : 0.45}
                  stroke="#ffffff"
                  strokeWidth={2}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        {/* Center Donut Label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
          <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">
            {activeCategory ? activeCategory.name : 'Total Spent'}
          </span>
          <span className="text-sm font-bold text-gray-900 truncate max-w-[100px]">
            {formatCurrency(activeCategory ? activeCategory.amount : totalExpense)}
          </span>
          {activeCategory && (
            <span className="text-[10px] font-semibold text-gray-600">
              {activeCategory.percentage}%
            </span>
          )}
        </div>
      </div>

      {/* Category Slices List / Progress Bars */}
      <div className="space-y-2 pt-1">
        {data.slice(0, 5).map((cat) => (
          <div key={cat.name} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${cat.color}20` }}
                >
                  <CategoryIcon name={cat.icon} size={12} style={{ color: cat.color }} />
                </div>
                <span className="font-semibold text-gray-800 truncate">{cat.name}</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 font-medium">
                <span className="text-gray-900 font-bold">{formatCurrency(cat.amount)}</span>
                <span className="text-gray-500 text-[11px]">({cat.percentage}%)</span>
              </div>
            </div>
            {/* Progress bar */}
            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${cat.percentage}%`, backgroundColor: cat.color }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

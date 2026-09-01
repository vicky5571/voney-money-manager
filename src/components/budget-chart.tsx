'use client';

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { formatCurrency } from '@/lib/utils';
import type { BudgetChartDataPoint } from '@/app/actions/budgets';

interface BudgetChartProps {
  data: BudgetChartDataPoint[];
  budgetLimit: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="bg-white/95 backdrop-blur-md p-3 rounded-xl shadow-lg border border-gray-100 text-xs space-y-1.5 min-w-[170px]">
      <p className="font-semibold text-gray-800 border-b border-gray-100 pb-1">{label}</p>
      {payload.map((entry, index) => {
        if (entry.value === null || entry.value === undefined) return null;
        return (
          <div key={`item-${index}`} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5 text-gray-600">
              <span
                className="w-2 h-2 rounded-full inline-block"
                style={{ backgroundColor: entry.color }}
              />
              {entry.name}
            </span>
            <span className="font-semibold text-gray-900">
              {formatCurrency(entry.value)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function BudgetChart({ data, budgetLimit }: BudgetChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center bg-gray-50 rounded-2xl text-gray-400 text-xs">
        No chart data available for this date range
      </div>
    );
  }

  // Format Y-axis tick in compact format (e.g. 500k, 1M)
  const formatYAxis = (val: number) => {
    if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
    if (val >= 1_000) return `${(val / 1_000).toFixed(0)}k`;
    return String(val);
  };

  return (
    <div className="w-full bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-4">
        <div>
          <h3 className="font-bold text-gray-900 text-sm">Spending Trajectory</h3>
          <p className="text-[11px] text-gray-400">Pace comparison & future projection</p>
        </div>
        <div className="text-right">
          <span className="text-[11px] font-medium text-gray-500">Limit: </span>
          <span className="text-xs font-bold text-gray-900">{formatCurrency(budgetLimit)}</span>
        </div>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
            <XAxis
              dataKey="date"
              stroke="#9CA3AF"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
              minTickGap={20}
            />
            <YAxis
              stroke="#9CA3AF"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatYAxis}
              domain={[0, 'auto']}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="top"
              align="right"
              iconType="plainline"
              wrapperStyle={{ fontSize: '11px', paddingBottom: '12px' }}
            />

            {/* 1. Recommended linear daily spending line */}
            <Line
              type="monotone"
              dataKey="recommended"
              name="Recommended"
              stroke="#10B981"
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={false}
              isAnimationActive={false}
            />

            {/* 2. Projected spending line */}
            <Line
              type="monotone"
              dataKey="projected"
              name="Projected"
              stroke="#F59E0B"
              strokeWidth={2}
              strokeDasharray="3 3"
              dot={false}
              isAnimationActive={false}
            />

            {/* 3. Actual daily spending line */}
            <Line
              type="monotone"
              dataKey="actual"
              name="Actual"
              stroke="#10B981"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5, fill: '#10B981', stroke: '#FFFFFF', strokeWidth: 2 }}
              connectNulls={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

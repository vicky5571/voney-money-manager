'use client';

import { useMemo, useState } from 'react';
import { Area, AreaChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatCurrency } from '@/lib/utils';

export interface SpendingTrendPoint {
  date: string;
  label: string;
  amount: number;
}

interface SpendingTrendChartProps {
  data: SpendingTrendPoint[];
}

interface TrendTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}

function TrendTooltip({ active, payload, label }: TrendTooltipProps) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-xl border border-gray-100 bg-white/95 px-3 py-2 shadow-lg backdrop-blur-md">
      <p className="text-[11px] font-medium text-gray-500">{label}</p>
      <p className="text-sm font-bold text-gray-900">{formatCurrency(payload[0].value)}</p>
    </div>
  );
}

export function SpendingTrendChart({ data }: SpendingTrendChartProps) {
  const [days, setDays] = useState<7 | 30>(7);
  const chartData = useMemo(() => data.slice(-days), [data, days]);
  const total = chartData.reduce((sum, point) => sum + point.amount, 0);
  const todayLabel = chartData.at(-1)?.label;

  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-gray-900">Spending trend</h2>
          <p className="mt-0.5 text-xs text-gray-400">{formatCurrency(total)} in last {days} days</p>
        </div>
        <div className="flex rounded-lg bg-gray-100 p-0.5">
          {([7, 30] as const).map((range) => (
            <button
              key={range}
              type="button"
              onClick={() => setDays(range)}
              className={`min-h-8 rounded-md px-2.5 text-xs font-semibold transition-colors ${
                days === range ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500'
              }`}
              aria-pressed={days === range}
            >
              {range}D
            </button>
          ))}
        </div>
      </div>

      <div className="h-36 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 6, right: 4, left: -18, bottom: 0 }}>
            <defs>
              <linearGradient id="spending-area" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#059669" stopOpacity={0.28} />
                <stop offset="100%" stopColor="#059669" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#9CA3AF', fontSize: 10 }}
              interval="preserveStartEnd"
              minTickGap={22}
            />
            <YAxis hide domain={[0, 'auto']} />
            {todayLabel && (
              <ReferenceLine
                x={todayLabel}
                stroke="#A5B4FC"
                strokeDasharray="3 3"
                label={{ value: 'Today', position: 'insideTopRight', fill: '#10B981', fontSize: 10 }}
              />
            )}
            <Tooltip content={<TrendTooltip />} cursor={{ stroke: '#C7D2FE', strokeWidth: 1 }} />
            <Area
              type="monotone"
              dataKey="amount"
              stroke="#059669"
              strokeWidth={2.5}
              fill="url(#spending-area)"
              activeDot={{ r: 4, fill: '#059669', stroke: '#FFFFFF', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

'use client';

import { useState, useEffect } from 'react';
import {
  Sparkles,
  TrendingUp,
  ShieldCheck,
  Calendar,
  ChevronRight,
  X,
  Target,
  Info,
  Clock,
  PiggyBank,
  SlidersHorizontal,
  Check,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { formatCurrency, cn } from '@/lib/utils';
import type { FinancialHealthResult } from '@/lib/financial-health';

interface FinancialHealthCardProps {
  health: FinancialHealthResult;
  income: number;
}

const PRESET_TARGETS = [10, 15, 20, 25, 30, 40, 50];

export function FinancialHealthCard({ health, income }: FinancialHealthCardProps) {
  const [showDetail, setShowDetail] = useState(false);
  const [showTargetModal, setShowTargetModal] = useState(false);
  const [targetPct, setTargetPct] = useState<number>(20);
  useEffect(() => {
    try {
      const saved = localStorage.getItem('voney_savings_target_pct');
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= 1 && parsed <= 95) {
          setTargetPct(parsed);
          setTempTargetPct(parsed);
        }
      }
    } catch {
      // Ignore
    }
  }, []);
  const [tempTargetPct, setTempTargetPct] = useState<number>(targetPct);

  const handleSaveTarget = (pct: number) => {
    const validPct = Math.min(95, Math.max(1, pct));
    setTargetPct(validPct);
    setShowTargetModal(false);
    try {
      localStorage.setItem('voney_savings_target_pct', String(validPct));
    } catch {
      // Ignore localStorage errors
    }
  };

  // SVG circular arc progress calculations
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (health.score / 100) * circumference;

  const targetSavingsAmount = income > 0 ? Math.round(income * (targetPct / 100)) : 0;
  const currentSavings = Math.max(0, health.netSavings);
  const savingsProgress =
    targetSavingsAmount > 0
      ? Math.min(100, Math.round((currentSavings / targetSavingsAmount) * 100))
      : 0;

  return (
    <>
      <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-4 transition-all hover:shadow-md">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center">
              <Sparkles size={16} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900">Financial Health & Forecast</h2>
              <p className="text-[11px] text-gray-500 font-medium">Monthly score & trajectory</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowDetail(true)}
            className="min-h-[44px] px-2.5 text-xs font-bold text-emerald-500 hover:text-emerald-500 flex items-center gap-0.5 active:scale-95 transition-all"
          >
            Insights <ChevronRight size={14} />
          </button>
        </div>

        {/* Score Ring & Rating Row */}
        <div className="flex items-center gap-4 bg-gray-50/80 p-3.5 rounded-2xl border border-gray-100">
          {/* Circular Score Gauge */}
          <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
            <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
              <circle
                cx="32"
                cy="32"
                r={radius}
                className="stroke-gray-200"
                strokeWidth="5"
                fill="transparent"
              />
              <circle
                cx="32"
                cy="32"
                r={radius}
                stroke={health.ratingColor}
                strokeWidth="5"
                fill="transparent"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="text-base font-extrabold text-gray-900 leading-none">
                {health.score}
              </span>
              <span className="text-[9px] font-bold text-gray-500 mt-0.5">/100</span>
            </div>
          </div>

          {/* Rating Title & Subtitle */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span
                className="text-xs font-bold px-2 py-0.5 rounded-full text-white"
                style={{ backgroundColor: health.ratingColor }}
              >
                {health.rating}
              </span>
              <span className="text-[11px] font-medium text-gray-500">
                {health.runwayDays}d runway
              </span>
            </div>
            <p className="text-xs text-gray-600 mt-1 line-clamp-2 leading-relaxed">
              {health.recommendations[0] || 'Keep tracking to maintain financial balance.'}
            </p>
          </div>
        </div>

        {/* Metrics Pill Grid */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
            <p className="text-[10px] font-semibold text-gray-500 uppercase">Savings Rate</p>
            <p
              className={cn(
                'text-xs font-bold mt-0.5',
                health.savingsRate >= targetPct
                  ? 'text-emerald-500'
                  : health.savingsRate > 0
                  ? 'text-emerald-500'
                  : 'text-gray-600'
              )}
            >
              {health.savingsRate}%
            </p>
          </div>
          <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
            <p className="text-[10px] font-semibold text-gray-500 uppercase">Daily Pace</p>
            <p className="text-xs font-bold text-gray-900 mt-0.5">
              ~{formatCurrency(health.dailySpendAverage)}
            </p>
          </div>
          <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
            <p className="text-[10px] font-semibold text-gray-500 uppercase">Projected</p>
            <p
              className={cn(
                'text-xs font-bold mt-0.5 truncate',
                health.forecast.isProjectedOverBudget ? 'text-red-600' : 'text-emerald-500'
              )}
            >
              {formatCurrency(health.forecast.projectedMonthEndSpend)}
            </p>
          </div>
        </div>

        {/* Month-End Forecast Banner */}
        <div
          className={cn(
            'p-3.5 rounded-2xl text-xs font-medium space-y-2 border',
            health.forecast.isProjectedOverBudget
              ? 'bg-red-50/70 border-red-200 text-red-800'
              : 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
          )}
        >
          <div className="flex items-center justify-between text-[11px] font-bold">
            <span className="flex items-center gap-1.5">
              <TrendingUp size={14} /> End-of-Month Forecast
            </span>
            <span className="text-[10px] opacity-80">
              Day {health.forecast.daysPassed} of {health.forecast.totalDaysInMonth}
            </span>
          </div>

          <div className="flex items-start gap-1.5 text-xs leading-relaxed">
            {health.forecast.isProjectedOverBudget ? (
              <AlertTriangle size={14} className="text-red-600 shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" />
            )}
            <p>{health.forecast.forecastMessage}</p>
          </div>

          {/* Month Pace Progress Bar */}
          <div className="w-full bg-white/70 rounded-full h-2 overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                health.forecast.isProjectedOverBudget ? 'bg-red-500' : 'bg-emerald-500'
              )}
              style={{
                width: `${Math.min(
                  100,
                  Math.round(
                    (health.forecast.daysPassed / health.forecast.totalDaysInMonth) * 100
                  )
                )}%`,
              }}
            />
          </div>
        </div>

        {/* Target Savings Goal Progress with Change Button */}
        {income > 0 && (
          <div className="p-3.5 bg-emerald-50/60 rounded-2xl border border-emerald-100 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                <PiggyBank size={14} className="text-emerald-500" /> {targetPct}% Savings Target
              </span>
              <button
                type="button"
                onClick={() => {
                  setTempTargetPct(targetPct);
                  setShowTargetModal(true);
                }}
                className="min-h-[44px] -my-3 px-2 text-[11px] font-bold text-emerald-500 hover:text-emerald-500 flex items-center gap-1 active:scale-95 transition-all"
                aria-label="Change savings target percentage"
              >
                <SlidersHorizontal size={12} />
                <span>{savingsProgress}%</span>
              </button>
            </div>
            <div className="w-full bg-white rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${savingsProgress}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-emerald-500 font-medium">
              <span>Saved: {formatCurrency(currentSavings)}</span>
              <span>Target: {formatCurrency(targetSavingsAmount)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Target Percentage Adjustment Modal */}
      {showTargetModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={() => setShowTargetModal(false)} />
          <div className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom sm:zoom-in-95 duration-200 max-h-[88vh] overflow-y-auto space-y-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center">
                  <PiggyBank size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Savings Target Goal</h3>
                  <p className="text-xs text-gray-500 font-medium">Set % of monthly income to save</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowTargetModal(false)}
                className="min-h-[44px] min-w-[44px] -mr-2 text-gray-500 hover:text-gray-700 flex items-center justify-center"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            {/* Target Display Preview */}
            <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-100 text-center space-y-1">
              <p className="text-xs text-emerald-500 font-semibold uppercase tracking-wider">
                Target Savings Rate
              </p>
              <p className="text-3xl font-extrabold text-emerald-900">{tempTargetPct}%</p>
              <p className="text-xs text-emerald-500 font-medium">
                Goal:{' '}
                <span className="font-bold">
                  {formatCurrency(Math.round(income * (tempTargetPct / 100)))}
                </span>{' '}
                per month
              </p>
            </div>

            {/* Quick Presets */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 block">
                Quick Presets
              </label>
              <div className="grid grid-cols-4 gap-2">
                {PRESET_TARGETS.map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setTempTargetPct(pct)}
                    className={cn(
                      'min-h-[44px] py-2 rounded-xl text-xs font-bold transition-all',
                      tempTargetPct === pct
                        ? 'bg-emerald-500 text-white shadow-sm scale-105'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    )}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-gray-700">
                <span>Custom Target</span>
                <span className="text-emerald-500 font-extrabold">{tempTargetPct}%</span>
              </div>
              <input
                type="range"
                min="1"
                max="80"
                step="1"
                value={tempTargetPct}
                onChange={(e) => setTempTargetPct(parseInt(e.target.value, 10))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <div className="flex justify-between text-[10px] text-gray-400 font-medium">
                <span>1% (Minimal)</span>
                <span>20% (Standard)</span>
                <span>50%+ (Aggressive)</span>
              </div>
            </div>

            {/* Save Actions */}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowTargetModal(false)}
                className="flex-1 min-h-[48px] py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSaveTarget(tempTargetPct)}
                className="flex-1 min-h-[48px] py-3 bg-emerald-500 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Check size={16} /> Save Target ({tempTargetPct}%)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detailed Insights Modal */}
      {showDetail && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={() => setShowDetail(false)} />
          <div className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom sm:zoom-in-95 duration-200 max-h-[88vh] overflow-y-auto space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Health Score Breakdown</h3>
                  <p className="text-xs text-gray-500 font-medium">How your score is calculated</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDetail(false)}
                className="min-h-[44px] min-w-[44px] -mr-2 text-gray-500 hover:text-gray-700 flex items-center justify-center"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            {/* Score Banner */}
            <div className="bg-gradient-to-br from-emerald-500 to-emerald-500 text-white rounded-2xl p-5 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider font-bold text-emerald-200">
                  Overall Score
                </span>
                <span
                  className="text-xs font-extrabold px-2.5 py-0.5 rounded-full text-white"
                  style={{ backgroundColor: health.ratingColor }}
                >
                  {health.rating}
                </span>
              </div>
              <p className="text-3xl font-extrabold tracking-tight">{health.score} / 100</p>
              <p className="text-xs text-emerald-100 leading-relaxed">
                Evaluated across savings rate, budget control, runway buffer, and subscription punctuality.
              </p>
            </div>

            {/* Factor Scores */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Score Components
              </h4>

              <div className="space-y-2">
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <PiggyBank size={16} className="text-emerald-500" />
                    <div>
                      <p className="text-xs font-bold text-gray-900">Savings Rate</p>
                      <p className="text-[10px] text-gray-500 font-medium">
                        {health.savingsRate}% of income saved (Target: {targetPct}%)
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-extrabold text-gray-900">
                    {health.factors.savingsScore} / 35 pts
                  </span>
                </div>

                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Target size={16} className="text-emerald-500" />
                    <div>
                      <p className="text-xs font-bold text-gray-900">Budget Adherence</p>
                      <p className="text-[10px] text-gray-500 font-medium">
                        Spending pacing vs total monthly budget
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-extrabold text-gray-900">
                    {health.factors.budgetScore} / 35 pts
                  </span>
                </div>

                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Clock size={16} className="text-blue-600" />
                    <div>
                      <p className="text-xs font-bold text-gray-900">Runway Buffer</p>
                      <p className="text-[10px] text-gray-500 font-medium">
                        {health.runwayDays} days at current spend
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-extrabold text-gray-900">
                    {health.factors.runwayScore} / 15 pts
                  </span>
                </div>

                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Calendar size={16} className="text-purple-600" />
                    <div>
                      <p className="text-xs font-bold text-gray-900">Bill Punctuality</p>
                      <p className="text-[10px] text-gray-500 font-medium">
                        On-time subscription payments
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-extrabold text-gray-900">
                    {health.factors.punctualityScore} / 15 pts
                  </span>
                </div>
              </div>
            </div>

            {/* Recommendations List */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1">
                <Info size={14} /> Actionable Recommendations
              </h4>
              <div className="space-y-2">
                {health.recommendations.map((rec, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 text-xs text-emerald-950 font-medium leading-relaxed flex items-start gap-2"
                  >
                    <span className="w-4 h-4 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span>{rec}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowDetail(false)}
              className="w-full min-h-[48px] py-3 bg-emerald-500 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all"
            >
              Close Insights
            </button>
          </div>
        </div>
      )}
    </>
  );
}

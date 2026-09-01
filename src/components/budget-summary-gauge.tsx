"use client";

import { motion } from "motion/react";
import { formatCurrency } from "@/lib/utils";
import { AlertTriangle, Plus } from "lucide-react";

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
  const remainingPercentage =
    totalBudget > 0
      ? Math.max(0, Math.min(100, (remaining / totalBudget) * 100))
      : 0;

  // Semi-circle arc circumference: C = pi * r = pi * 92 ~= 289.027
  const arcLength = 289.027;
  const strokeDashoffset = arcLength * (1 - remainingPercentage / 100);

  return (
    <div className="w-full bg-white rounded-3xl p-5 shadow-sm border border-gray-100 space-y-4">
      {/* Half Circle Gauge Section */}
      <div className="relative flex flex-col items-center justify-center pt-2">
        <svg
          viewBox="0 0 200 120"
          className="w-72 h-44 sm:w-80 sm:h-48 overflow-visible"
        >
          <defs>
            {/* Healthy Animated Moving Cyber-Mint & Lime Gradient */}
            <linearGradient
              id="budget-gauge-glow"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="0%"
            >
              <stop offset="0%" stopColor="#44EBCF">
                <animate
                  attributeName="stop-color"
                  values="#44EBCF;#ADFA1F;#6FF7CC;#37D8C5;#44EBCF"
                  dur="4s"
                  repeatCount="indefinite"
                />
              </stop>
              <stop offset="50%" stopColor="#ADFA1F">
                <animate
                  attributeName="stop-color"
                  values="#ADFA1F;#6FF7CC;#37D8C5;#44EBCF;#ADFA1F"
                  dur="4s"
                  repeatCount="indefinite"
                />
              </stop>
              <stop offset="100%" stopColor="#6FF7CC">
                <animate
                  attributeName="stop-color"
                  values="#6FF7CC;#37D8C5;#44EBCF;#ADFA1F;#6FF7CC"
                  dur="4s"
                  repeatCount="indefinite"
                />
              </stop>
            </linearGradient>

            {/* Warning / Critical Gradients */}
            <linearGradient
              id="budget-gauge-warning"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="0%"
            >
              <stop offset="0%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#FBBF24" />
            </linearGradient>

            <linearGradient
              id="budget-gauge-danger"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="0%"
            >
              <stop offset="0%" stopColor="#EF4444" />
              <stop offset="100%" stopColor="#F87171" />
            </linearGradient>

            {/* Neon Glow Filter */}
            <filter
              id="gauge-neon-glow"
              x="-20%"
              y="-20%"
              width="140%"
              height="140%"
            >
              <feDropShadow
                dx="0"
                dy="0"
                stdDeviation="3"
                floodColor={
                  isOverBudget
                    ? "#EF4444"
                    : remainingPercentage < 35
                      ? "#F59E0B"
                      : "#44EBCF"
                }
                floodOpacity="0.6"
              />
            </filter>
          </defs>

          {/* Background Track Arc */}
          <path
            d="M 8 105 A 92 92 0 0 1 192 105"
            fill="none"
            stroke="#F3F4F6"
            strokeWidth="8"
            strokeLinecap="round"
          />

          {/* Animated Progress Remaining Arc Sweep */}
          {totalBudget > 0 && (
            <motion.path
              d="M 8 105 A 92 92 0 0 1 192 105"
              fill="none"
              stroke={
                isOverBudget || remainingPercentage < 15
                  ? "url(#budget-gauge-danger)"
                  : remainingPercentage < 35
                    ? "url(#budget-gauge-warning)"
                    : "url(#budget-gauge-glow)"
              }
              strokeWidth="9"
              strokeLinecap="round"
              strokeDasharray={arcLength}
              initial={{ strokeDashoffset: arcLength }}
              animate={{ strokeDashoffset: strokeDashoffset }}
              transition={{
                duration: 1.1,
                ease: [0.16, 1, 0.3, 1],
              }}
              filter="url(#gauge-neon-glow)"
            />
          )}
        </svg>

        {/* Center Text Information with Motion Entry */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15, ease: "easeOut" }}
          className="absolute top-20 flex flex-col items-center text-center px-4"
        >
          <div className="flex items-center gap-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
            <span>Amount you can spend</span>
          </div>

          <span
            className={`text-2xl sm:text-3xl font-black mt-1 tracking-tight ${
              isOverBudget ? "text-red-600" : "text-gray-900"
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
            <span className="text-[11px] text-gray-400 mt-0.5">
              No budget set
            </span>
          )}
        </motion.div>
      </div>

      {/* 3-Column Summary Stats with Motion Entry */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.25, ease: "easeOut" }}
        className="grid grid-cols-3 gap-2 pt-3 border-t border-gray-100 text-center"
      >
        <div className="bg-gray-50/80 p-2.5 rounded-2xl">
          <span className="text-[10px] text-gray-400 uppercase font-semibold block">
            Total Budgets
          </span>
          <p className="text-xs font-bold text-gray-900 mt-0.5">
            {formatCurrency(totalBudget)}
          </p>
        </div>

        <div className="bg-gray-50/80 p-2.5 rounded-2xl">
          <span className="text-[10px] text-gray-400 uppercase font-semibold block">
            Total Spent
          </span>
          <p className="text-xs font-bold text-gray-900 mt-0.5">
            {formatCurrency(totalSpent)}
          </p>
        </div>

        <div className="bg-gray-50/80 p-2.5 rounded-2xl">
          <span className="text-[10px] text-gray-400 uppercase font-semibold block">
            Days Left
          </span>
          <p className="text-xs font-bold text-gray-900 mt-0.5">
            {daysLeft} days
          </p>
        </div>
      </motion.div>

      {/* Create Budget Button */}
      <button
        onClick={onAddBudget}
        className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-500 text-white rounded-2xl text-sm font-semibold hover:bg-emerald-600 active:scale-[0.98] transition-all shadow-sm cursor-pointer"
      >
        <Plus size={16} />
        Create Budget
      </button>
    </div>
  );
}

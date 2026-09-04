"use client";

import { useState, useEffect } from "react";
import { formatCurrency } from "@/lib/utils";
import { Eye, EyeOff } from "lucide-react";

interface BalanceCardProps {
  totalBalance: number;
  income: number;
  expense: number;
}

export function BalanceCard({
  totalBalance,
  income,
  expense,
}: BalanceCardProps) {
  const [showBalance, setShowBalance] = useState(true);
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("voney:show-balance");
      if (saved === "false") setShowBalance(false);
    } catch {}
  }, []);

  const toggleBalance = () => {
    setShowBalance((visible) => {
      const nextVisible = !visible;
      window.localStorage.setItem("voney:show-balance", String(nextVisible));
      return nextVisible;
    });
  };

  const maskValue = (value: number) => {
    return showBalance ? formatCurrency(value) : "••••••••";
  };

  return (
    <div className="relative w-full max-w-full overflow-hidden bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-600 rounded-3xl p-5 sm:p-6 text-white shadow-md">
      {/* Subtle Dark Gradient Overlay covering entire card */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/[0.02] via-black/[0.03] to-black/[0.04] pointer-events-none" />

      {/* Idle Parallelogram Flash Animation */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 z-0 animate-parallelogram-flash"
      >
        <div className="relative flex items-center justify-center">
          {/* Main Parallelogram */}
          <div className="w-12 sm:w-14 h-48 sm:h-56 bg-gradient-to-r from-white/10 via-white/25 to-white/10 border-x border-white/25 shadow-[0_0_20px_rgba(255,255,255,0.2)] backdrop-blur-[1px]" />
          {/* Inner Highlight Line */}
          <div className="absolute w-2 h-48 sm:h-56 bg-white/35" />
        </div>
      </div>

      {/* Content wrapper with z-index above overlay */}
      <div className="relative z-10 space-y-4">
        {/* Top Total Balance Row */}
        <div>
          <div className="flex items-center justify-between text-emerald-100 text-xs sm:text-sm font-medium mb-1">
            <span className="uppercase text-[11px] tracking-wider font-semibold">
              Total Balance
            </span>
            <button
              type="button"
              onClick={toggleBalance}
              className="min-h-[44px] min-w-[44px] px-2 py-1 -mr-2 hover:bg-white/10 rounded-xl transition-colors flex items-center gap-1.5 text-xs text-emerald-100 font-medium"
              aria-label={showBalance ? "Hide balance" : "Show balance"}
            >
              {showBalance ? <EyeOff size={16} /> : <Eye size={16} />}
              <span>{showBalance ? "Hide" : "Show"}</span>
            </button>
          </div>

          <div className="text-2xl sm:text-3xl font-extrabold tracking-tight truncate">
            {maskValue(totalBalance)}
          </div>
        </div>

        {/* Monthly Summary Header with Badge */}
        <div className="pt-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-200">
              Monthly Cash Flow
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/20 text-white backdrop-blur-sm shrink-0">
              This Month
            </span>
          </div>

          {/* Constrained Grid for Income & Expense Pills */}
          <div className="grid grid-cols-2 gap-2 sm:gap-2.5 w-full">
            {/* Income Pill */}
            <div className="min-w-0 bg-white/10 backdrop-blur rounded-2xl p-2.5 sm:p-3 flex items-center gap-2 border border-white/10 overflow-hidden">
              <div className="w-7 h-7 rounded-full bg-emerald-400/20 flex items-center justify-center shrink-0">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-medium text-emerald-100 block leading-tight">
                  Income
                </span>
                <span className="text-xs sm:text-sm font-bold truncate block text-white mt-0.5">
                  {maskValue(income)}
                </span>
              </div>
            </div>

            {/* Expense Pill */}
            <div className="min-w-0 bg-white/10 backdrop-blur rounded-2xl p-2.5 sm:p-3 flex items-center gap-2 border border-white/10 overflow-hidden">
              <div className="w-7 h-7 rounded-full bg-red-400/20 flex items-center justify-center shrink-0">
                <div className="w-2 h-2 rounded-full bg-red-400" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-medium text-emerald-100 block leading-tight">
                  Expense
                </span>
                <span className="text-xs sm:text-sm font-bold truncate block text-white mt-0.5">
                  {maskValue(expense)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

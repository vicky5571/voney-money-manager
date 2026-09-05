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
    <div className="relative w-full max-w-full overflow-hidden bg-gradient-to-br from-emerald-500 via-emerald-400 to-teal-300 rounded-3xl p-5 sm:p-6 text-white shadow-md">
      {/* Subtle Light Sheen Overlay */}
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.03] to-white/[0.08] pointer-events-none" />

      {/* Idle Parallelogram Flash Animation across whole card including monthly cash flow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl z-20"
      >
        <div className="animate-parallelogram-flash absolute inset-y-0 w-full flex items-center justify-center">
          <div
            className="relative flex items-center justify-center h-full"
            style={{ transform: "skewX(-20deg)" }}
          >
            {/* Soft Ambient Glow */}
            <div className="absolute w-28 sm:w-32 -top-24 -bottom-24 bg-gradient-to-r from-transparent via-white/20 to-transparent blur-md pointer-events-none" />
            {/* Main Parallelogram Sheen */}
            <div className="absolute w-14 sm:w-16 -top-24 -bottom-24 bg-gradient-to-r from-white/10 via-white/45 to-white/10 border-x border-white/30 shadow-[0_0_25px_rgba(255,255,255,0.3)] backdrop-blur-[0.5px]" />
            {/* Central Bright Streak */}
            <div className="absolute w-2 -top-24 -bottom-24 bg-gradient-to-b from-white/20 via-white/80 to-white/20 shadow-[0_0_8px_rgba(255,255,255,0.7)]" />
          </div>
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
            <span className="text-[11px] font-semibold uppercase tracking-wider text-white/90">
              Monthly Cash Flow
            </span>
            <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-white border border-white/30 shadow-[0_2px_8px_rgba(0,0,0,0.06)] drop-shadow-[0_1px_2px_rgba(0,0,0,0.15)] shrink-0">
              This Month
            </span>
          </div>

          {/* Constrained Grid for Income & Expense Pills */}
          <div className="grid grid-cols-2 gap-2 sm:gap-2.5 w-full">
            {/* Income Pill */}
            <div className="min-w-0 bg-white/20 backdrop-blur-md rounded-2xl p-2.5 sm:p-3 flex items-center gap-2.5 border border-white/30 shadow-[0_2px_10px_rgba(0,0,0,0.06)] overflow-hidden">
              <div className="w-7 h-7 rounded-full bg-emerald-950/20 flex items-center justify-center shrink-0">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-300 shadow-[0_0_8px_rgba(110,231,183,0.9)]" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-semibold text-white/85 block leading-tight uppercase tracking-wider">
                  Income
                </span>
                <span className="text-xs sm:text-sm font-extrabold truncate block text-white mt-0.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.15)]">
                  {maskValue(income)}
                </span>
              </div>
            </div>

            {/* Expense Pill */}
            <div className="min-w-0 bg-white/20 backdrop-blur-md rounded-2xl p-2.5 sm:p-3 flex items-center gap-2.5 border border-white/30 shadow-[0_2px_10px_rgba(0,0,0,0.06)] overflow-hidden">
              <div className="w-7 h-7 rounded-full bg-red-950/20 flex items-center justify-center shrink-0">
                <div className="w-2.5 h-2.5 rounded-full bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.9)]" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-semibold text-white/85 block leading-tight uppercase tracking-wider">
                  Expense
                </span>
                <span className="text-xs sm:text-sm font-extrabold truncate block text-white mt-0.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.15)]">
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

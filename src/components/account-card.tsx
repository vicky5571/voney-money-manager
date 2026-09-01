import {
  Wallet,
  Building2,
  Smartphone,
  ChevronRight,
  SlidersHorizontal,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

interface AccountCardProps {
  id?: string;
  name: string;
  type: "cash" | "bank" | "e-wallet";
  balance: number;
  onClick?: () => void;
  onAdjust?: () => void;
}

export function AccountCard({
  name,
  type,
  balance,
  onClick,
  onAdjust,
}: AccountCardProps) {
  const getIconInfo = () => {
    switch (type) {
      case "cash":
        return {
          Icon: Wallet,
          color: "text-emerald-600",
          bg: "bg-emerald-100",
        };
      case "bank":
        return { Icon: Building2, color: "text-blue-600", bg: "bg-blue-100" };
      case "e-wallet":
        return {
          Icon: Smartphone,
          color: "text-purple-600",
          bg: "bg-purple-100",
        };
    }
  };

  const getTypeLabel = () => {
    switch (type) {
      case "cash":
        return "Cash";
      case "bank":
        return "Bank";
      case "e-wallet":
        return "E-Wallet";
    }
  };

  const { Icon, color, bg } = getIconInfo();

  return (
    <div
      onClick={onClick}
      className={cn(
        "bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center justify-between transition-all cursor-pointer hover:shadow-md active:scale-[0.98]",
      )}
    >
      <div className="flex items-center gap-4">
        <div
          className={cn(
            "w-12 h-12 rounded-full flex items-center justify-center shrink-0",
            bg,
          )}
        >
          <Icon size={20} className={color} />
        </div>
        <div className="flex flex-col">
          <span className="font-medium text-gray-900">{name}</span>
          <span className="text-xs bg-gray-100 text-gray-600 rounded-full px-2 py-0.5 w-fit mt-1">
            {getTypeLabel()}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="font-bold text-gray-900 text-sm">
          {formatCurrency(balance)}
        </div>
        {onAdjust && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAdjust();
            }}
            className="min-h-[44px] min-w-[44px] p-2 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-emerald-600 flex items-center justify-center transition-colors cursor-pointer"
            aria-label={`Adjust balance for ${name}`}
            title="Adjust Balance"
          >
            <SlidersHorizontal size={16} />
          </button>
        )}
        <ChevronRight size={18} className="text-gray-400 shrink-0" />
      </div>
    </div>
  );
}

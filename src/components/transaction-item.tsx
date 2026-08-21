'use client';

import { CategoryIcon } from '@/constants/categories';
import { cn, formatCurrency } from '@/lib/utils';

interface TransactionItemProps {
  id: string;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  note: string | null;
  amount: number;
  type: 'income' | 'expense';
  date: string;
  onClick?: () => void;
}

export function TransactionItem({
  categoryName,
  categoryIcon,
  categoryColor,
  note,
  amount,
  type,
  onClick
}: TransactionItemProps) {
  const isIncome = type === 'income';

  return (
    <div 
      onClick={onClick}
      className={cn(
        "flex flex-row items-center justify-between p-3 rounded-xl transition-colors",
        onClick ? "cursor-pointer hover:bg-gray-50" : ""
      )}
    >
      <div className="flex items-center gap-3">
        <div 
          className="flex items-center justify-center w-10 h-10 rounded-full shrink-0"
          style={{ backgroundColor: `${categoryColor}1A` }}
        >
          <CategoryIcon name={categoryIcon} size={20} style={{ color: categoryColor }} />
        </div>
        <div className="flex flex-col">
          <span className="font-semibold text-gray-900 text-sm">{categoryName}</span>
          {note && (
            <span className="text-xs text-gray-500 max-w-[150px] truncate">
              {note}
            </span>
          )}
        </div>
      </div>
      
      <div className={cn(
        "font-semibold shrink-0",
        isIncome ? "text-emerald-600" : "text-red-500"
      )}>
        {isIncome ? '+' : '-'}{formatCurrency(amount)}
      </div>
    </div>
  );
}

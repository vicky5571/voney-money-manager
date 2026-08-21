import { CategoryIcon } from '@/constants/categories';
import { formatCurrency } from '@/lib/utils';

interface BudgetProgressProps {
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  spent: number;
  limit: number;
}

export function BudgetProgress({
  categoryName,
  categoryIcon,
  categoryColor,
  spent,
  limit
}: BudgetProgressProps) {
  const percentage = limit > 0 ? (spent / limit) * 100 : 100;
  const displayPercentage = Math.min(percentage, 100);
  
  let progressColor = '#22C55E'; // green
  if (percentage >= 100) {
    progressColor = '#EF4444'; // red
  } else if (percentage >= 80) {
    progressColor = '#F59E0B'; // orange
  }

  return (
    <div className="flex flex-col gap-2 w-full p-4 bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div 
            className="flex items-center justify-center w-9 h-9 rounded-full shrink-0"
            style={{ backgroundColor: `${categoryColor}1A` }}
          >
            <CategoryIcon name={categoryIcon} size={18} style={{ color: categoryColor }} />
          </div>
          <span className="font-semibold text-gray-900 text-sm">{categoryName}</span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-sm font-bold" style={{ color: progressColor }}>
            {percentage.toFixed(0)}%
          </span>
        </div>
      </div>
      
      <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden mt-1">
        <div 
          className="h-full rounded-full transition-all duration-500"
          style={{ 
            width: `${displayPercentage}%`,
            backgroundColor: progressColor 
          }}
        />
      </div>
      
      <div className="flex justify-between items-center text-xs text-gray-500 mt-1">
        <span>{formatCurrency(spent)} spent</span>
        <span>{formatCurrency(limit)} limit</span>
      </div>
    </div>
  );
}

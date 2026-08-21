import { CategoryIcon } from '@/constants/categories';
import { formatCurrency } from '@/lib/utils';
import { Calendar, Trash2 } from 'lucide-react';

interface BudgetProgressProps {
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  spent: number;
  limit: number;
  startDate?: string;
  endDate?: string;
  onDelete?: () => void;
}

function formatDateRange(startDate?: string, endDate?: string) {
  if (!startDate || !endDate) return null;
  const start = new Date(startDate);
  const end = new Date(endDate);
  const startFormatted = start.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
  const endFormatted = end.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  return `${startFormatted} – ${endFormatted}`;
}

function getDaysRemaining(endDate?: string) {
  if (!endDate) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);
  const diffTime = end.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return 'Ended';
  if (diffDays === 0) return 'Last day today';
  if (diffDays === 1) return '1 day left';
  return `${diffDays} days left`;
}

function getTodayProgress(startDate?: string, endDate?: string): number | null {
  if (!startDate || !endDate) return null;
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);
  const now = new Date();

  const totalTime = end.getTime() - start.getTime();
  if (totalTime <= 0) return null;

  const elapsedTime = now.getTime() - start.getTime();
  const percentage = (elapsedTime / totalTime) * 100;

  // Only display if today falls within or at the boundaries of the budget period
  if (percentage < 0 || percentage > 100) return null;
  return Math.min(Math.max(percentage, 0), 100);
}

export function BudgetProgress({
  categoryName,
  categoryIcon,
  categoryColor,
  spent,
  limit,
  startDate,
  endDate,
  onDelete
}: BudgetProgressProps) {
  const percentage = limit > 0 ? (spent / limit) * 100 : 100;
  const displayPercentage = Math.min(percentage, 100);
  const dateRangeStr = formatDateRange(startDate, endDate);
  const daysLeftStr = getDaysRemaining(endDate);
  const todayPercentage = getTodayProgress(startDate, endDate);
  
  let progressColor = '#22C55E'; // green
  if (percentage >= 100) {
    progressColor = '#EF4444'; // red
  } else if (percentage >= 80) {
    progressColor = '#F59E0B'; // orange
  }

  // Label horizontal shift alignment when near edges
  const getLabelTransform = (pct: number) => {
    if (pct < 12) return 'translateX(0%)';
    if (pct > 88) return 'translateX(-100%)';
    return 'translateX(-50%)';
  };

  return (
    <div className="flex flex-col gap-2.5 w-full p-4 bg-white rounded-2xl shadow-sm border border-gray-100 transition-all hover:shadow-md">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div 
            className="flex items-center justify-center w-10 h-10 rounded-full shrink-0"
            style={{ backgroundColor: `${categoryColor}1A` }}
          >
            <CategoryIcon name={categoryIcon} size={20} style={{ color: categoryColor }} />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-gray-900 text-sm">{categoryName}</span>
            {dateRangeStr && (
              <div className="flex items-center gap-1 text-[11px] text-gray-400 mt-0.5">
                <Calendar size={12} />
                <span>{dateRangeStr}</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end">
            <span className="text-sm font-bold" style={{ color: progressColor }}>
              {percentage.toFixed(0)}%
            </span>
            {daysLeftStr && (
              <span className="text-[10px] font-medium text-gray-400">
                {daysLeftStr}
              </span>
            )}
          </div>
          {onDelete && (
            <button
              onClick={onDelete}
              className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              title="Delete budget"
              aria-label="Delete budget"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>
      
      {/* Progress Bar Container with Today Indicator */}
      <div className="relative pt-4 pb-0.5">
        {/* "Today" line indicator and tag */}
        {todayPercentage !== null && (
          <div 
            className="absolute top-0 z-20 pointer-events-none flex flex-col items-center"
            style={{ left: `${todayPercentage}%` }}
          >
            <div 
              className="px-1.5 py-0.5 bg-gray-900 text-white rounded text-[9px] font-bold tracking-wider leading-none shadow-sm flex items-center justify-center"
              style={{ transform: getLabelTransform(todayPercentage) }}
            >
              Today
            </div>
            <div className="w-[1.5px] h-4 bg-gray-900/80 -mt-0.5" />
          </div>
        )}

        {/* Progress Track */}
        <div className="relative w-full h-2.5 rounded-full bg-gray-100 overflow-hidden">
          <div 
            className="h-full rounded-full transition-all duration-500"
            style={{ 
              width: `${displayPercentage}%`,
              backgroundColor: progressColor 
            }}
          />
        </div>
      </div>
      
      {/* Footer spent vs limit */}
      <div className="flex justify-between items-center text-xs text-gray-500 font-medium">
        <span>{formatCurrency(spent)} spent</span>
        <span>{formatCurrency(limit)} limit</span>
      </div>
    </div>
  );
}

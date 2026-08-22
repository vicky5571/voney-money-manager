'use client';

import { useRef, useState } from 'react';
import { CategoryIcon } from '@/constants/categories';
import { cn, formatCurrency } from '@/lib/utils';
import { Trash2 } from 'lucide-react';

interface TransactionItemProps {
  id: string;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  accountName?: string | null;
  note: string | null;
  amount: number;
  type: 'income' | 'expense';
  date: string;
  onClick?: () => void;
  onSwipeDelete?: () => void;
}

const SNAP_WIDTH = 76;
const SWIPE_THRESHOLD = 36;

export function TransactionItem({
  categoryName,
  categoryIcon,
  categoryColor,
  accountName,
  note,
  amount,
  type,
  onClick,
  onSwipeDelete,
}: TransactionItemProps) {
  const isIncome = type === 'income';
  const [swipeX, setSwipeX] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const isDragging = useRef(false);
  const isOpen = swipeX <= -(SNAP_WIDTH - 5);

  const snapTo = (x: number) => {
    setIsTransitioning(true);
    setSwipeX(x);
    setTimeout(() => setIsTransitioning(false), 280);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsTransitioning(false);
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isDragging.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const dx = e.touches[0].clientX - touchStartX.current;
    const dy = e.touches[0].clientY - touchStartY.current;

    if (!isDragging.current) {
      // Ignore until clearly horizontal
      if (Math.abs(dy) > Math.abs(dx) || Math.abs(dx) < 5) return;
      isDragging.current = true;
    }

    const base = isOpen ? -SNAP_WIDTH : 0;
    const newX = Math.min(0, Math.max(-SNAP_WIDTH - 8, base + dx));
    setSwipeX(newX);
  };

  const handleTouchEnd = () => {
    if (!isDragging.current) return;
    if (swipeX < -SWIPE_THRESHOLD) {
      snapTo(-SNAP_WIDTH);
    } else {
      snapTo(0);
    }
  };

  const handleClick = () => {
    if (isDragging.current) return; // was a swipe, not a tap
    if (isOpen) {
      snapTo(0);
      return;
    }
    onClick?.();
  };

  return (
    <div className="relative overflow-hidden bg-white first:rounded-t-2xl last:rounded-b-2xl">
      {/* Delete action revealed only when swiping or open */}
      {onSwipeDelete && swipeX < 0 && (
        <div className="absolute right-0 top-0 bottom-0 w-[76px] bg-red-500 flex items-center justify-center z-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              snapTo(0);
              onSwipeDelete();
            }}
            className="flex flex-col items-center gap-0.5 text-white w-full h-full justify-center"
          >
            <Trash2 size={17} />
            <span className="text-[10px] font-bold tracking-wide">Delete</span>
          </button>
        </div>
      )}

      {/* Swipeable row */}
      <div
        onClick={handleClick}
        onTouchStart={onSwipeDelete ? handleTouchStart : undefined}
        onTouchMove={onSwipeDelete ? handleTouchMove : undefined}
        onTouchEnd={onSwipeDelete ? handleTouchEnd : undefined}
        style={{
          transform: `translateX(${swipeX}px)`,
          transition: isTransitioning ? 'transform 0.25s ease-out' : 'none',
        }}
        className={cn(
          'relative z-10 flex flex-row items-center justify-between p-3 bg-white w-full',
          (onClick || onSwipeDelete) ? 'cursor-pointer active:bg-gray-50' : ''
        )}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center w-10 h-10 rounded-full shrink-0"
            style={{ backgroundColor: `${categoryColor}1A` }}
          >
            <CategoryIcon name={categoryIcon} size={20} style={{ color: categoryColor }} />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-semibold text-gray-900 text-sm truncate">{categoryName}</span>
            <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
              {accountName && (
                <span className="text-[10px] font-medium bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded shrink-0">
                  {accountName}
                </span>
              )}
              {note && (
                <span className="text-xs text-gray-500 truncate max-w-[140px]">{note}</span>
              )}
            </div>
          </div>
        </div>

        <div className={cn('font-semibold shrink-0 text-sm', isIncome ? 'text-emerald-600' : 'text-red-500')}>
          {isIncome ? '+' : '-'}{formatCurrency(amount)}
        </div>
      </div>
    </div>
  );
}

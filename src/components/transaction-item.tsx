'use client';

import { useRef, useState } from 'react';
import { CategoryIcon } from '@/constants/categories';
import { cn, formatCurrency } from '@/lib/utils';
import { Trash2, RefreshCw, Clock } from 'lucide-react';

interface TransactionItemProps {
  id: string;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  categoryScope?: string;
  accountName?: string | null;
  note: string | null;
  amount: number;
  type: 'income' | 'expense';
  date: string;
  isPending?: boolean;
  isSettled?: boolean;
  onClick?: () => void;
  onSwipeDelete?: () => void;
}

const SNAP_WIDTH = 76;
const SWIPE_THRESHOLD = 36;

export function TransactionItem({
  categoryName,
  categoryIcon,
  categoryColor,
  categoryScope,
  accountName,
  note,
  amount,
  type,
  date,
  isPending,
  isSettled,
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

  const isFutureHold = isSettled !== false && date > new Date().toISOString().split('T')[0];
  const hasMetadata = Boolean(accountName || isPending || isSettled === false || isFutureHold);

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
          'relative z-10 flex flex-row items-center justify-between p-3.5 bg-white w-full gap-3',
          (onClick || onSwipeDelete) ? 'cursor-pointer active:bg-gray-50' : ''
        )}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div
            className="flex items-center justify-center w-10 h-10 rounded-full shrink-0"
            style={{ backgroundColor: `${categoryColor}1A` }}
          >
            <CategoryIcon name={categoryIcon} size={20} style={{ color: categoryColor }} />
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            {/* Category Name & Scope Badge */}
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="font-semibold text-gray-900 text-sm truncate">{categoryName}</span>
              {categoryScope === 'business' && (
                <span className="text-[9px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 px-1 py-0.2 rounded border border-indigo-200/50 shrink-0">
                  Biz
                </span>
              )}
            </div>

            {/* Note directly below title */}
            {note && (
              <p className="text-xs text-gray-500 truncate mt-0.5 leading-snug">
                {note}
              </p>
            )}

            {/* Metadata Row: Badges & Account */}
            {hasMetadata && (
              <div className="flex items-center gap-1.5 mt-1 min-w-0 flex-wrap">
                {isPending && (
                  <span
                    className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200/70 px-1.5 py-0.5 rounded-sm shrink-0 shadow-2xs"
                    title="Saved locally • Syncing in background"
                  >
                    <RefreshCw size={9} className="animate-spin text-amber-600 shrink-0" />
                    Syncing
                  </span>
                )}
                {isSettled === false && (
                  <span
                    className="inline-flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200/80 px-1.5 py-0.5 rounded-sm shrink-0"
                    title="Pending Settle • Wallet balance not yet deducted"
                  >
                    <Clock size={8.5} className="text-amber-600 shrink-0" />
                    Pending Settle
                  </span>
                )}
                {isFutureHold && (
                  <span
                    className="inline-flex items-center text-[9px] font-bold uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200/70 px-1.5 py-0.5 rounded-sm shrink-0"
                    title="Committed Hold • Balance deducted for future date"
                  >
                    Hold
                  </span>
                )}
                {accountName && (
                  <span className="text-[10px] font-medium bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded shrink-0 truncate max-w-[120px]">
                    {accountName}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className={cn('font-semibold shrink-0 text-right text-sm whitespace-nowrap pl-2', isIncome ? 'text-emerald-500' : 'text-red-500')}>
          {isIncome ? '+' : '-'}{formatCurrency(amount)}
        </div>
      </div>
    </div>
  );
}

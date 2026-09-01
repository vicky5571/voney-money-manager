'use client';

import { CategoryIcon } from '@/constants/categories';
import { cn } from '@/lib/utils';
import { Settings2 } from 'lucide-react';

interface CategoryGridProps {
  categories: Array<{
    id: string;
    name: string;
    icon: string;
    color: string;
  }>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onManageCategories?: () => void;
}

export function CategoryGrid({
  categories,
  selectedId,
  onSelect,
  onManageCategories,
}: CategoryGridProps) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {categories.map((cat) => {
        const isSelected = selectedId === cat.id;

        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => onSelect(cat.id)}
            className={cn(
              'flex flex-col items-center justify-center p-3 rounded-2xl transition-all min-h-[96px]',
              isSelected
                ? 'bg-emerald-50 ring-2 ring-emerald-600'
                : 'bg-gray-50 hover:bg-gray-100 active:scale-95'
            )}
          >
            <div
              className="flex items-center justify-center w-12 h-12 rounded-full mb-2"
              style={{ backgroundColor: `${cat.color}1A` }}
            >
              <CategoryIcon name={cat.icon} size={24} style={{ color: cat.color }} />
            </div>
            <span
              className={cn(
                'text-xs font-semibold text-center truncate max-w-[80px]',
                isSelected ? 'text-emerald-700 font-bold' : 'text-gray-700'
              )}
            >
              {cat.name}
            </span>
          </button>
        );
      })}

      {/* Manage / Add Custom Category Card */}
      {onManageCategories && (
        <button
          type="button"
          onClick={onManageCategories}
          className="flex flex-col items-center justify-center p-3 rounded-2xl bg-emerald-50/50 hover:bg-emerald-100/60 border border-dashed border-emerald-200 transition-all min-h-[96px] active:scale-95 text-emerald-600"
        >
          <div className="flex items-center justify-center w-12 h-12 rounded-full mb-2 bg-emerald-100 text-emerald-600">
            <Settings2 size={22} />
          </div>
          <span className="text-xs font-bold text-center text-emerald-700">
            Manage
          </span>
        </button>
      )}
    </div>
  );
}

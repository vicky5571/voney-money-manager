'use client';

import { getCategoryIcon } from '@/constants/categories';
import { cn } from '@/lib/utils';

interface CategoryGridProps {
  categories: Array<{
    id: string;
    name: string;
    icon: string;
    color: string;
  }>;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function CategoryGrid({ categories, selectedId, onSelect }: CategoryGridProps) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {categories.map((cat) => {
        const Icon = getCategoryIcon(cat.icon);
        const isSelected = selectedId === cat.id;
        
        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => onSelect(cat.id)}
            className={cn(
              "flex flex-col items-center justify-center p-3 rounded-2xl transition-all",
              isSelected 
                ? "bg-indigo-50 ring-2 ring-indigo-600" 
                : "bg-gray-50 hover:bg-gray-100"
            )}
          >
            <div 
              className="flex items-center justify-center w-12 h-12 rounded-full mb-2"
              style={{ backgroundColor: `${cat.color}1A` }}
            >
              <Icon size={24} style={{ color: cat.color }} />
            </div>
            <span className={cn(
              "text-xs font-medium text-center",
              isSelected ? "text-indigo-700" : "text-gray-700"
            )}>
              {cat.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}

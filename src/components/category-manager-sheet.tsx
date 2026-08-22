'use client';

import { useState, useTransition } from 'react';
import { X, Plus, Trash2, Edit2, Loader2, Check } from 'lucide-react';
import { createCategory, updateCategory, deleteCategory } from '@/app/actions/categories';
import {
  CategoryIcon,
  AVAILABLE_CATEGORY_ICONS,
  AVAILABLE_CATEGORY_COLORS,
} from '@/constants/categories';
import { cn } from '@/lib/utils';

export interface CategoryItem {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: string;
  is_default?: boolean;
  user_id?: string | null;
}

interface CategoryManagerSheetProps {
  isOpen: boolean;
  onClose: () => void;
  categories: CategoryItem[];
  onCategoryCreated?: (newCategory: CategoryItem) => void;
}

export function CategoryManagerSheet({
  isOpen,
  onClose,
  categories,
  onCategoryCreated,
}: CategoryManagerSheetProps) {
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<'expense' | 'income'>('expense');
  const [mode, setMode] = useState<'list' | 'create' | 'edit'>('list');
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);
  const [error, setError] = useState('');

  // Form states
  const [name, setName] = useState('');
  const [icon, setIcon] = useState(AVAILABLE_CATEGORY_ICONS[0]);
  const [color, setColor] = useState(AVAILABLE_CATEGORY_COLORS[0]);
  const [type, setType] = useState<'expense' | 'income'>('expense');

  if (!isOpen) return null;

  const openCreate = () => {
    setName('');
    setIcon(AVAILABLE_CATEGORY_ICONS[0]);
    setColor(AVAILABLE_CATEGORY_COLORS[0]);
    setType(activeTab);
    setError('');
    setMode('create');
  };

  const openEdit = (cat: CategoryItem) => {
    setEditingCategory(cat);
    setName(cat.name);
    setIcon(cat.icon);
    setColor(cat.color);
    setType(cat.type as 'expense' | 'income');
    setError('');
    setMode('edit');
  };

  const handleSave = () => {
    if (!name.trim()) {
      setError('Please enter a category name');
      return;
    }

    setError('');
    startTransition(async () => {
      try {
        if (mode === 'create') {
          const created = await createCategory({
            name: name.trim(),
            icon,
            color,
            type,
          });
          if (created && onCategoryCreated) {
            onCategoryCreated(created as CategoryItem);
          }
        } else if (mode === 'edit' && editingCategory) {
          await updateCategory(editingCategory.id, {
            name: name.trim(),
            icon,
            color,
            type,
          });
        }
        setMode('list');
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to save category');
      }
    });
  };

  const handleDelete = (id: string) => {
    setError('');
    startTransition(async () => {
      try {
        await deleteCategory(id);
        setMode('list');
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to delete category');
      }
    });
  };

  const filteredCategories = categories.filter((c) => c.type === activeTab);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom sm:zoom-in-95 duration-200 max-h-[88vh] overflow-y-auto">
        {/* Top Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">
            {mode === 'list'
              ? 'Manage Categories'
              : mode === 'create'
              ? 'New Category'
              : 'Edit Category'}
          </h2>
          <button
            type="button"
            onClick={mode === 'list' ? onClose : () => setMode('list')}
            className="min-h-[44px] min-w-[44px] -mr-2 text-gray-500 hover:text-gray-700 flex items-center justify-center"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {mode === 'list' ? (
          <div className="space-y-4">
            {/* Tab switch */}
            <div className="flex bg-gray-100 rounded-xl p-1">
              <button
                type="button"
                onClick={() => setActiveTab('expense')}
                className={cn(
                  'flex-1 min-h-[40px] py-1.5 rounded-lg text-xs font-bold transition-all',
                  activeTab === 'expense'
                    ? 'bg-white text-red-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                )}
              >
                Expense ({categories.filter((c) => c.type === 'expense').length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('income')}
                className={cn(
                  'flex-1 min-h-[40px] py-1.5 rounded-lg text-xs font-bold transition-all',
                  activeTab === 'income'
                    ? 'bg-white text-emerald-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                )}
              >
                Income ({categories.filter((c) => c.type === 'income').length})
              </button>
            </div>

            {/* Create New Button */}
            <button
              type="button"
              onClick={openCreate}
              className="w-full min-h-[44px] py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all"
            >
              <Plus size={16} /> Add Custom Category
            </button>

            {/* Category List */}
            <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
              {filteredCategories.map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center justify-between p-3 bg-gray-50/80 rounded-2xl border border-gray-100"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${cat.color}1A` }}
                    >
                      <CategoryIcon name={cat.icon} size={20} style={{ color: cat.color }} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{cat.name}</p>
                      <span className="text-[10px] text-gray-500 font-medium">
                        {cat.is_default ? 'System Default' : 'Custom Category'}
                      </span>
                    </div>
                  </div>

                  {!cat.is_default && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(cat)}
                        className="min-h-[44px] min-w-[44px] p-2 text-gray-500 hover:text-indigo-600 flex items-center justify-center"
                        aria-label="Edit category"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(cat.id)}
                        disabled={isPending}
                        className="min-h-[44px] min-w-[44px] p-2 text-gray-500 hover:text-red-600 flex items-center justify-center"
                        aria-label="Delete category"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Form: Create or Edit Category */
          <div className="space-y-4">
            {/* Category Preview */}
            <div className="flex items-center justify-center py-4 bg-gray-50 rounded-2xl border border-gray-100">
              <div className="flex flex-col items-center gap-2">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-sm"
                  style={{ backgroundColor: `${color}20` }}
                >
                  <CategoryIcon name={icon} size={32} style={{ color }} />
                </div>
                <span className="text-sm font-bold text-gray-900">
                  {name.trim() || 'Category Name'}
                </span>
              </div>
            </div>

            {/* Name Input */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5 block">
                Category Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Coffee, Groceries, Streaming"
                maxLength={30}
                className="w-full min-h-[48px] px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Type selector */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5 block">
                Type
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setType('expense')}
                  className={cn(
                    'flex-1 min-h-[44px] py-2 rounded-xl text-xs font-bold transition-all',
                    type === 'expense'
                      ? 'bg-red-500 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600'
                  )}
                >
                  Expense
                </button>
                <button
                  type="button"
                  onClick={() => setType('income')}
                  className={cn(
                    'flex-1 min-h-[44px] py-2 rounded-xl text-xs font-bold transition-all',
                    type === 'income'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600'
                  )}
                >
                  Income
                </button>
              </div>
            </div>

            {/* Icon Picker */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5 block">
                Select Icon
              </label>
              <div className="grid grid-cols-6 gap-2 max-h-36 overflow-y-auto p-2 bg-gray-50 rounded-2xl border border-gray-200">
                {AVAILABLE_CATEGORY_ICONS.map((iconName) => (
                  <button
                    key={iconName}
                    type="button"
                    onClick={() => setIcon(iconName)}
                    className={cn(
                      'min-h-[44px] flex items-center justify-center rounded-xl transition-all',
                      icon === iconName
                        ? 'bg-indigo-600 text-white shadow-sm scale-105'
                        : 'bg-white text-gray-700 hover:bg-gray-100'
                    )}
                  >
                    <CategoryIcon
                      name={iconName}
                      size={20}
                      style={{ color: icon === iconName ? '#ffffff' : undefined }}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Color Palette Picker */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5 block">
                Select Color
              </label>
              <div className="flex flex-wrap gap-2.5 p-2.5 bg-gray-50 rounded-2xl border border-gray-200">
                {AVAILABLE_CATEGORY_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center transition-all',
                      color === c ? 'ring-3 ring-indigo-500 ring-offset-2 scale-110' : 'hover:scale-105'
                    )}
                    style={{ backgroundColor: c }}
                  >
                    {color === c && <Check size={14} className="text-white drop-shadow" />}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <p className="text-xs text-red-600 font-semibold p-2 bg-red-50 rounded-xl">
                {error}
              </p>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setMode('list')}
                disabled={isPending}
                className="flex-1 min-h-[48px] py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isPending || !name.trim()}
                className="flex-1 min-h-[48px] py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {isPending ? <Loader2 size={16} className="animate-spin" /> : 'Save Category'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

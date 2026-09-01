"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import {
  motion,
  AnimatePresence,
  Reorder,
  useDragControls,
} from "motion/react";
import {
  X,
  Plus,
  Trash2,
  Edit2,
  Loader2,
  Check,
  GripVertical,
} from "lucide-react";
import {
  createCategory,
  updateCategory,
  deleteCategory,
  reorderCategories,
} from "@/app/actions/categories";
import {
  CategoryIcon,
  AVAILABLE_CATEGORY_ICONS,
  AVAILABLE_CATEGORY_COLORS,
} from "@/constants/categories";
import { cn, sortCategoriesByOrder, saveCategoryOrder } from "@/lib/utils";

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
  onCategoryReordered?: (reorderedCategories: CategoryItem[]) => void;
}

function CategoryReorderRow({
  cat,
  onEdit,
  onDelete,
  isPending,
}: {
  cat: CategoryItem;
  onEdit: (cat: CategoryItem) => void;
  onDelete: (id: string) => void;
  isPending: boolean;
}) {
  const dragControls = useDragControls();

  return (
    <Reorder.Item
      value={cat}
      id={cat.id}
      dragListener={false}
      dragControls={dragControls}
      whileDrag={{
        scale: 1.03,
        zIndex: 999,
        backgroundColor: "#ffffff",
        boxShadow: "0 16px 36px rgba(0, 0, 0, 0.16)",
      }}
      className="relative flex items-center justify-between p-3 bg-gray-50/90 rounded-2xl border border-gray-100 select-none"
    >
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        {/* Drag Grip Handle with touch-none for direct 1:1 pointer tracking */}
        <div
          onPointerDown={(e) => {
            e.preventDefault();
            dragControls.start(e);
          }}
          className="p-2 -m-1 text-gray-400 hover:text-gray-700 active:text-emerald-500 cursor-grab active:cursor-grabbing shrink-0 touch-none"
          title="Hold and drag to reorder"
        >
          <GripVertical size={18} />
        </div>

        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${cat.color}1A` }}
        >
          <CategoryIcon
            name={cat.icon}
            size={20}
            style={{ color: cat.color }}
          />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">
            {cat.name}
          </p>
          <span className="text-[10px] text-gray-500 font-medium">
            {cat.is_default ? "System Default" : "Custom Category"}
          </span>
        </div>
      </div>

      {!cat.is_default && (
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(cat);
            }}
            className="min-h-[44px] min-w-[44px] p-2 text-gray-400 hover:text-emerald-500 flex items-center justify-center rounded-xl hover:bg-white transition-colors cursor-pointer"
            aria-label={`Edit ${cat.name}`}
          >
            <Edit2 size={16} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(cat.id);
            }}
            disabled={isPending}
            className="min-h-[44px] min-w-[44px] p-2 text-gray-400 hover:text-red-600 flex items-center justify-center rounded-xl hover:bg-white transition-colors cursor-pointer"
            aria-label={`Delete ${cat.name}`}
          >
            <Trash2 size={16} />
          </button>
        </div>
      )}
    </Reorder.Item>
  );
}

export function CategoryManagerSheet({
  isOpen,
  onClose,
  categories,
  onCategoryCreated,
  onCategoryReordered,
}: CategoryManagerSheetProps) {
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<"expense" | "income">("expense");
  const [mode, setMode] = useState<"list" | "create" | "edit">("list");
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(
    null,
  );
  const [error, setError] = useState("");
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Local reordered/mutated list state
  const [localCategories, setLocalCategories] = useState<CategoryItem[] | null>(
    null,
  );
  const currentCategories =
    localCategories ?? sortCategoriesByOrder(categories);

  // Form states
  const [name, setName] = useState("");
  const [icon, setIcon] = useState(AVAILABLE_CATEGORY_ICONS[0]);
  const [color, setColor] = useState(AVAILABLE_CATEGORY_COLORS[0]);
  const [type, setType] = useState<"expense" | "income">("expense");

  useEffect(() => {
    if (isOpen && (mode === "create" || mode === "edit")) {
      const timer = setTimeout(() => {
        nameInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen, mode]);

  const openCreate = () => {
    setName("");
    setIcon(AVAILABLE_CATEGORY_ICONS[0]);
    setColor(AVAILABLE_CATEGORY_COLORS[0]);
    setType(activeTab);
    setError("");
    setMode("create");
  };

  const openEdit = (cat: CategoryItem) => {
    setEditingCategory(cat);
    setName(cat.name);
    setIcon(cat.icon);
    setColor(cat.color);
    setType(cat.type as "expense" | "income");
    setError("");
    setMode("edit");
  };

  const handleSave = () => {
    if (!name.trim()) {
      setError("Please enter a category name");
      return;
    }

    setError("");
    startTransition(async () => {
      try {
        if (mode === "create") {
          const created = await createCategory({
            name: name.trim(),
            icon,
            color,
            type,
          });
          if (created && onCategoryCreated) {
            onCategoryCreated(created as CategoryItem);
          }
        } else if (mode === "edit" && editingCategory) {
          await updateCategory(editingCategory.id, {
            name: name.trim(),
            icon,
            color,
            type,
          });
        }
        setMode("list");
      } catch (err: unknown) {
        setError(
          err instanceof Error ? err.message : "Failed to save category",
        );
      }
    });
  };

  const handleDelete = (id: string) => {
    setError("");
    startTransition(async () => {
      try {
        await deleteCategory(id);
        const updated = (localCategories ?? currentCategories).filter(
          (c) => c.id !== id,
        );
        setLocalCategories(updated);
        saveCategoryOrder(updated.map((c) => c.id));
        setMode("list");
      } catch (err: unknown) {
        setError(
          err instanceof Error ? err.message : "Failed to delete category",
        );
      }
    });
  };

  const filteredCategories = currentCategories.filter(
    (c) => c.type === activeTab,
  );

  const handleReorder = (newTabCategories: CategoryItem[]) => {
    // Preserve categories of other types while replacing the active tab order
    const otherCategories = currentCategories.filter(
      (c) => c.type !== activeTab,
    );
    const updated =
      activeTab === "expense"
        ? [...newTabCategories, ...otherCategories]
        : [...otherCategories, ...newTabCategories];

    setLocalCategories(updated);
    saveCategoryOrder(updated.map((c) => c.id));

    if (onCategoryReordered) {
      onCategoryReordered(updated);
    }

    // Persist in background
    startTransition(async () => {
      try {
        await reorderCategories(newTabCategories.map((c) => c.id));
      } catch {
        // Non-blocking background sync
      }
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4">
          {/* Fast Lightweight Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            onClick={onClose}
          />

          {/* Snappy Lightweight Sheet */}
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.99 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[90vh] sm:max-h-[85vh] overflow-hidden"
          >
            {/* Pinned Top Header */}
            <div className="px-6 pt-3 pb-3 border-b border-gray-100 shrink-0 bg-white">
              <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-2.5 sm:hidden" />
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-gray-900">
                    {mode === "list"
                      ? "Manage Categories"
                      : mode === "create"
                        ? "New Category"
                        : "Edit Category"}
                  </h2>
                  {mode === "list" && (
                    <p className="text-[11px] text-gray-400">
                      Hold and drag{" "}
                      <GripVertical className="inline w-3 h-3 -mt-0.5" /> to
                      rearrange
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={mode === "list" ? onClose : () => setMode("list")}
                  className="min-h-[44px] min-w-[44px] -mr-2 text-gray-400 hover:text-gray-700 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
                  aria-label="Close"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Scrollable Content Body */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-6 py-4 space-y-4">
              {mode === "list" ? (
                <div className="space-y-3">
                  {/* Tab switch */}
                  <div className="flex bg-gray-100/90 rounded-2xl p-1">
                    <button
                      type="button"
                      onClick={() => setActiveTab("expense")}
                      className={cn(
                        "flex-1 min-h-[40px] py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                        activeTab === "expense"
                          ? "bg-white text-red-600 shadow-xs"
                          : "text-gray-600 hover:text-gray-900",
                      )}
                    >
                      Expense (
                      {
                        currentCategories.filter((c) => c.type === "expense")
                          .length
                      }
                      )
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("income")}
                      className={cn(
                        "flex-1 min-h-[40px] py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                        activeTab === "income"
                          ? "bg-white text-emerald-500 shadow-xs"
                          : "text-gray-600 hover:text-gray-900",
                      )}
                    >
                      Income (
                      {
                        currentCategories.filter((c) => c.type === "income")
                          .length
                      }
                      )
                    </button>
                  </div>

                  {/* Hold and Drag Category Reorder List */}
                  <Reorder.Group
                    axis="y"
                    values={filteredCategories}
                    onReorder={handleReorder}
                    className="space-y-2"
                  >
                    {filteredCategories.map((cat) => (
                      <CategoryReorderRow
                        key={cat.id}
                        cat={cat}
                        onEdit={openEdit}
                        onDelete={handleDelete}
                        isPending={isPending}
                      />
                    ))}
                  </Reorder.Group>
                </div>
              ) : (
                /* Form: Create or Edit Category */
                <div className="space-y-4">
                  {/* Category Preview */}
                  <div className="flex items-center justify-center py-4 bg-gray-50/80 rounded-2xl border border-gray-100">
                    <div className="flex flex-col items-center gap-2">
                      <div
                        className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-xs"
                        style={{ backgroundColor: `${color}20` }}
                      >
                        <CategoryIcon name={icon} size={32} style={{ color }} />
                      </div>
                      <span className="text-sm font-bold text-gray-900">
                        {name.trim() || "Category Name"}
                      </span>
                    </div>
                  </div>

                  {/* Name Input */}
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5 block">
                      Category Name
                    </label>
                    <input
                      ref={nameInputRef}
                      type="text"
                      autoFocus
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Coffee, Groceries, Streaming"
                      maxLength={30}
                      className="w-full min-h-[48px] px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900"
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
                        onClick={() => setType("expense")}
                        className={cn(
                          "flex-1 min-h-[44px] py-2 rounded-xl text-xs font-bold transition-all cursor-pointer",
                          type === "expense"
                            ? "bg-red-500 text-white shadow-xs"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200",
                        )}
                      >
                        Expense
                      </button>
                      <button
                        type="button"
                        onClick={() => setType("income")}
                        className={cn(
                          "flex-1 min-h-[44px] py-2 rounded-xl text-xs font-bold transition-all cursor-pointer",
                          type === "income"
                            ? "bg-emerald-500 text-white shadow-xs"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200",
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
                    <div className="grid grid-cols-6 gap-2 max-h-36 overflow-y-auto overscroll-contain p-2 bg-gray-50 rounded-2xl border border-gray-200">
                      {AVAILABLE_CATEGORY_ICONS.map((iconName) => (
                        <button
                          key={iconName}
                          type="button"
                          onClick={() => setIcon(iconName)}
                          className={cn(
                            "min-h-[44px] flex items-center justify-center rounded-xl transition-all cursor-pointer",
                            icon === iconName
                              ? "bg-emerald-500 text-white shadow-xs scale-105"
                              : "bg-white text-gray-700 hover:bg-gray-100",
                          )}
                          aria-label={`Select icon ${iconName}`}
                        >
                          <CategoryIcon
                            name={iconName}
                            size={20}
                            style={{
                              color: icon === iconName ? "#ffffff" : undefined,
                            }}
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
                            "w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer",
                            color === c
                              ? "ring-3 ring-emerald-500 ring-offset-2 scale-110"
                              : "hover:scale-105",
                          )}
                          style={{ backgroundColor: c }}
                          aria-label={`Select color ${c}`}
                        >
                          {color === c && (
                            <Check
                              size={14}
                              className="text-white drop-shadow"
                            />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {error && (
                    <p className="text-xs text-red-600 font-semibold p-2.5 bg-red-50 rounded-xl border border-red-100">
                      {error}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Pinned Sticky Bottom Footer with Safe Area Support */}
            <div className="p-4 sm:p-5 bg-white border-t border-gray-100 shrink-0 pb-[max(env(safe-area-inset-bottom,0px),1rem)]">
              {mode === "list" ? (
                <button
                  type="button"
                  onClick={openCreate}
                  className="w-full min-h-[48px] py-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-all cursor-pointer shadow-xs border border-emerald-100/80"
                >
                  <Plus size={16} /> Add Custom Category
                </button>
              ) : (
                <div className="flex gap-2.5">
                  <button
                    type="button"
                    onClick={() => setMode("list")}
                    disabled={isPending}
                    className="flex-1 min-h-[48px] py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl text-xs font-bold transition-all active:scale-[0.98] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={isPending || !name.trim()}
                    className="flex-1 min-h-[48px] py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 active:scale-[0.98] shadow-md shadow-emerald-500/20 disabled:opacity-50 cursor-pointer"
                  >
                    {isPending ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      "Save Category"
                    )}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

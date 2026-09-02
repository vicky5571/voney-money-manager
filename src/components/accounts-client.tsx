"use client";

import { useState, useTransition, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  X,
  Trash2,
  Loader2,
  Repeat,
  Tags,
  ChevronRight,
  SlidersHorizontal,
  GripVertical,
} from "lucide-react";
import {
  motion,
  AnimatePresence,
  useDragControls,
  type DragControls,
} from "motion/react";
import {
  createAccount,
  updateAccount,
  deleteAccount,
  reorderAccounts,
} from "@/app/actions/accounts";
import { AccountCard } from "@/components/account-card";
import {
  CategoryManagerSheet,
  type CategoryItem,
} from "@/components/category-manager-sheet";
import { BalanceAdjustmentModal } from "@/components/balance-adjustment-modal";
import {
  formatCurrency,
  cn,
  sortAccountsByOrder,
  saveAccountOrder,
} from "@/lib/utils";
import {
  hapticLight,
  hapticMedium,
  hapticSelection,
} from "@/lib/capacitor";

export interface AccountData {
  id: string;
  name: string;
  type: "cash" | "bank" | "e-wallet";
  icon: string;
  balance: number;
}

interface AccountsClientProps {
  accounts: AccountData[];
  categories?: CategoryItem[];
  initialEditId?: string;
}

interface SlotRect {
  left: number;
  right: number;
  top: number;
  bottom: number;
  centerX: number;
  centerY: number;
}

export function AccountsClient({
  accounts,
  categories = [],
  initialEditId,
}: AccountsClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showCategoryManager, setShowCategoryManager] = useState(false);

  const initialAccount = initialEditId
    ? accounts.find((a) => a.id === initialEditId) || null
    : null;
  const [mode, setMode] = useState<"add" | "edit" | null>(
    initialAccount ? "edit" : null,
  );
  const [selectedAccount, setSelectedAccount] = useState<AccountData | null>(
    initialAccount,
  );
  const [error, setError] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [adjustingAccount, setAdjustingAccount] = useState<AccountData | null>(
    null,
  );

  const [formData, setFormData] = useState<{
    name: string;
    type: "cash" | "bank" | "e-wallet";
    balance: string;
  }>({
    name: initialAccount?.name || "",
    type: initialAccount?.type || "cash",
    balance: "",
  });

  // --- Wallet reorder state (mirrors CategoryGrid) ---
  const [isEditing, setIsEditing] = useState(false);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [items, setItems] = useState<AccountData[]>(() =>
    sortAccountsByOrder(accounts),
  );
  const [prevAccounts, setPrevAccounts] = useState<AccountData[]>(accounts);
  const containerRef = useRef<HTMLDivElement>(null);
  const slotRectsRef = useRef<SlotRect[]>([]);
  const reorderedItemsRef = useRef<AccountData[] | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressTriggeredRef = useRef(false);
  const wasDraggingRef = useRef(false);
  const lastDragEndTimeRef = useRef(0);
  const pointerStartRef = useRef<{ x: number; y: number; id: string } | null>(
    null,
  );

  if (accounts !== prevAccounts) {
    setPrevAccounts(accounts);
    setItems(sortAccountsByOrder(accounts));
    setIsEditing(false);
    setActiveDragId(null);
  }

  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    };
  }, []);

  const totalBalance = accounts.reduce(
    (sum, account) => sum + account.balance,
    0,
  );

  const openAdd = () => {
    setFormData({ name: "", type: "cash", balance: "" });
    setError("");
    setShowDeleteConfirm(false);
    setMode("add");
  };

  const openEdit = (account: AccountData) => {
    setSelectedAccount(account);
    setFormData({ name: account.name, type: account.type, balance: "" });
    setError("");
    setShowDeleteConfirm(false);
    setMode("edit");
  };

  const closeSheet = () => {
    setMode(null);
    setSelectedAccount(null);
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      setError("Name is required");
      return;
    }

    setError("");
    startTransition(async () => {
      try {
        if (mode === "add") {
          await createAccount({
            name: formData.name,
            type: formData.type,
            balance: formData.balance ? Number(formData.balance) : 0,
            icon: "wallet",
          });
        } else if (mode === "edit" && selectedAccount) {
          await updateAccount(selectedAccount.id, {
            name: formData.name,
            type: formData.type,
          });
        }
        closeSheet();
        router.refresh();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to save account");
      }
    });
  };

  const handleDelete = () => {
    if (!selectedAccount) return;
    setError("");
    startTransition(async () => {
      try {
        await deleteAccount(selectedAccount.id);
        closeSheet();
        router.refresh();
      } catch (err: unknown) {
        setError(
          err instanceof Error ? err.message : "Failed to delete account",
        );
        setShowDeleteConfirm(false);
      }
    });
  };

  // ----- Wallet reorder helpers -----
  const measureSlotRects = useCallback(() => {
    if (!containerRef.current) return;
    const children = Array.from(containerRef.current.children);
    slotRectsRef.current = children.map((child) => {
      const rect = child.getBoundingClientRect();
      return {
        left: rect.left,
        right: rect.right,
        top: rect.top,
        bottom: rect.bottom,
        centerX: rect.left + rect.width / 2,
        centerY: rect.top + rect.height / 2,
      };
    });
  }, []);

  const handleDragEnd = useCallback(() => {
    setIsEditing(false);
    setActiveDragId(null);
    wasDraggingRef.current = true;
    lastDragEndTimeRef.current = Date.now() + 600;
    hapticLight();
    const finalItems = reorderedItemsRef.current ?? items;
    if (reorderedItemsRef.current) {
      saveAccountOrder(finalItems.map((c) => c.id));
      reorderAccounts(finalItems.map((c) => c.id)).catch(() => {});
      reorderedItemsRef.current = null;
    }
  }, [items]);

  useEffect(() => {
    if (!activeDragId && !isEditing) return;
    const handleGlobalPointerUp = () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
      handleDragEnd();
    };
    window.addEventListener("pointerup", handleGlobalPointerUp);
    window.addEventListener("pointercancel", handleGlobalPointerUp);
    window.addEventListener("touchend", handleGlobalPointerUp);
    return () => {
      window.removeEventListener("pointerup", handleGlobalPointerUp);
      window.removeEventListener("pointercancel", handleGlobalPointerUp);
      window.removeEventListener("touchend", handleGlobalPointerUp);
    };
  }, [activeDragId, isEditing, handleDragEnd]);

  const handleStartHold = useCallback(
    (id: string, e: React.PointerEvent, controls: DragControls) => {
      // Don't start drag when tapping the Adjust Balance button
      const target = e.target as HTMLElement;
      if (target.closest('button[aria-label^="Adjust"]')) {
        pointerStartRef.current = { x: e.clientX, y: e.clientY, id: "__adjust__" };
        return;
      }

      pointerStartRef.current = { x: e.clientX, y: e.clientY, id };
      isLongPressTriggeredRef.current = false;
      wasDraggingRef.current = false;

      if (isEditing) {
        wasDraggingRef.current = true;
        lastDragEndTimeRef.current = Date.now() + 1000;
        measureSlotRects();
        controls.start(e);
        setActiveDragId(id);
        hapticLight();
        return;
      }

      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = setTimeout(() => {
        isLongPressTriggeredRef.current = true;
        wasDraggingRef.current = true;
        lastDragEndTimeRef.current = Date.now() + 1000;
        setIsEditing(true);
        setActiveDragId(id);
        measureSlotRects();
        hapticMedium();
        controls.start(e);
      }, 350);
    },
    [isEditing, measureSlotRects],
  );

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (pointerStartRef.current) {
      const dist = Math.hypot(
        e.clientX - pointerStartRef.current.x,
        e.clientY - pointerStartRef.current.y,
      );
      if (dist > 8 && !isLongPressTriggeredRef.current) {
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }
      }
    }
  }, []);

  const handlePointerUp = useCallback(
    (id: string, account: AccountData, e?: React.PointerEvent) => {
      if (pointerStartRef.current?.id === "__adjust__") {
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }
        pointerStartRef.current = null;
        return;
      }
      // Also guard if the release was on the Adjust button
      if (e) {
        const t = e.target as HTMLElement;
        if (t.closest('button[aria-label^="Adjust"]')) {
          if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
          }
          pointerStartRef.current = null;
          return;
        }
      }
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
      if (isLongPressTriggeredRef.current || activeDragId) {
        handleDragEnd();
        pointerStartRef.current = null;
        return;
      }
      const isLockedByDrag = Date.now() < lastDragEndTimeRef.current;
      const didDragOrLongPress = wasDraggingRef.current || isLockedByDrag;
      if (!didDragOrLongPress && !isEditing) {
        openEdit(account);
        hapticLight();
      }
      pointerStartRef.current = null;
    },
    [activeDragId, handleDragEnd, isEditing],
  );

  const handlePointerCancel = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    if (activeDragId || isEditing) {
      handleDragEnd();
    }
    pointerStartRef.current = null;
  }, [activeDragId, isEditing, handleDragEnd]);

  const handleDragStart = useCallback(
    (id: string) => {
      wasDraggingRef.current = true;
      lastDragEndTimeRef.current = Date.now() + 1000;
      setActiveDragId(id);
      measureSlotRects();
    },
    [measureSlotRects],
  );

  const handleDrag = useCallback(
    (draggedId: string, point: { x: number; y: number }) => {
      wasDraggingRef.current = true;
      lastDragEndTimeRef.current = Date.now() + 1000;
      const slotRects = slotRectsRef.current;
      if (!slotRects.length) return;

      let targetIndex = -1;
      for (let i = 0; i < slotRects.length; i++) {
        const slot = slotRects[i];
        if (
          point.x >= slot.left &&
          point.x <= slot.right &&
          point.y >= slot.top &&
          point.y <= slot.bottom
        ) {
          targetIndex = i;
          break;
        }
      }
      if (targetIndex === -1) {
        let minDistance = Infinity;
        for (let i = 0; i < slotRects.length; i++) {
          const slot = slotRects[i];
          const dist = Math.hypot(point.x - slot.centerX, point.y - slot.centerY);
          if (dist < minDistance && dist < 140) {
            minDistance = dist;
            targetIndex = i;
          }
        }
      }
      if (targetIndex === -1) return;

      setItems((currentList) => {
        const draggedIndex = currentList.findIndex((c) => c.id === draggedId);
        if (draggedIndex === -1 || draggedIndex === targetIndex)
          return currentList;
        const reordered = [...currentList];
        const [moved] = reordered.splice(draggedIndex, 1);
        reordered.splice(targetIndex, 0, moved);
        reorderedItemsRef.current = reordered;
        hapticSelection();
        return reordered;
      });
    },
    [],
  );

  return (
    <div className="p-4 space-y-6 pb-24">
      {/* Top Header Card */}
      <div className="relative overflow-hidden bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-600 text-white rounded-3xl p-6 shadow-md">
        {/* Subtle Dark Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/[0.02] via-black/[0.03] to-black/[0.04] pointer-events-none" />

        <div className="relative z-10">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-emerald-100">
            Total Balance
          </h2>
          <p className="text-3xl font-extrabold tracking-tight mt-1">
            {formatCurrency(totalBalance)}
          </p>
        </div>
      </div>

      {/* Quick Shortcuts */}
      <div className="grid grid-cols-2 gap-2.5">
        <Link
          href="/recurring"
          className="min-h-[44px] p-3.5 bg-white hover:bg-gray-50 border border-gray-100 rounded-2xl shadow-xs flex items-center justify-between transition-all active:scale-[0.98]"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center">
              <Repeat size={16} />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-900">Subscriptions</p>
              <p className="text-[10px] text-gray-500">Recurring bills</p>
            </div>
          </div>
          <ChevronRight size={14} className="text-gray-400" />
        </Link>
        <button
          type="button"
          onClick={() => setShowCategoryManager(true)}
          className="min-h-[44px] p-3.5 bg-white hover:bg-gray-50 border border-gray-100 rounded-2xl shadow-xs flex items-center justify-between transition-all active:scale-[0.98] text-left"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Tags size={16} />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-900">Categories</p>
              <p className="text-[10px] text-gray-500">Custom labels</p>
            </div>
          </div>
          <ChevronRight size={14} className="text-gray-400" />
        </button>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">Your Wallets</h3>
            {items.length > 1 && !isEditing && (
              <p className="text-[11px] text-gray-400">
                Hold a wallet to reorder
              </p>
            )}
            {isEditing && (
              <p className="text-[11px] text-emerald-600 font-medium">
                Drag to reorder
              </p>
            )}
          </div>
          <button
            onClick={openAdd}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 text-white rounded-xl text-xs font-semibold hover:bg-emerald-500 active:scale-95 transition-all"
          >
            <Plus size={14} />
            Add Wallet
          </button>
        </div>

        {items.length === 0 ? (
          <div className="text-center py-10 bg-gray-50 rounded-2xl border border-gray-100">
            <p className="text-gray-500 text-sm">
              No accounts yet. Add your first account.
            </p>
          </div>
        ) : (
          <div ref={containerRef} className="grid gap-4">
            {items.map((account, index) => {
              const isDragging = activeDragId === account.id;
              const dragControls = useDragControls();
              return (
                <WalletRow
                  key={account.id}
                  account={account}
                  index={index}
                  isEditing={isEditing}
                  isDragging={isDragging}
                  dragControls={dragControls}
                  onStartHold={handleStartHold}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerCancel}
                  onDragStart={handleDragStart}
                  onDrag={handleDrag}
                  onDragEnd={handleDragEnd}
                  onAdjust={() => setAdjustingAccount(account)}
                />
              );
            })}
          </div>
        )}
      </div>

      {mode && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={closeSheet} />
          <div className="relative w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                {mode === "add" ? "Add Wallet" : "Edit Wallet"}
              </h2>
              <button
                onClick={closeSheet}
                className="p-2 -mr-2 text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g. Main Bank, Cash"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type
                </label>
                <div className="flex gap-2">
                  {(["cash", "bank", "e-wallet"] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setFormData({ ...formData, type })}
                      className={cn(
                        "flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-all capitalize",
                        formData.type === type
                          ? "bg-emerald-500 text-white shadow-md"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200",
                      )}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {mode === "add" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Initial Balance
                  </label>
                  <input
                    type="number"
                    value={formData.balance}
                    onChange={(e) =>
                      setFormData({ ...formData, balance: e.target.value })
                    }
                    placeholder="0.00"
                    step="0.01"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                  />
                </div>
              )}

              {mode === "edit" && selectedAccount && (
                <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide block">
                      Registered Balance
                    </span>
                    <span className="text-base font-bold text-gray-900">
                      {formatCurrency(selectedAccount.balance)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const accToAdjust = selectedAccount;
                      closeSheet();
                      setAdjustingAccount(accToAdjust);
                    }}
                    className="min-h-[44px] px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-500 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
                  >
                    <SlidersHorizontal size={14} />
                    Adjust Balance
                  </button>
                </div>
              )}

              {error && <p className="text-red-500 text-sm">{error}</p>}

              <button
                onClick={handleSave}
                disabled={isPending}
                className="w-full py-3.5 bg-emerald-500 text-white rounded-xl font-medium shadow-sm hover:bg-emerald-500 active:scale-[0.98] transition-all flex items-center justify-center disabled:opacity-70 disabled:active:scale-100 mt-2"
              >
                {isPending ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  "Save Wallet"
                )}
              </button>

              {mode === "edit" && (
                <div className="pt-4 mt-4 border-t border-gray-100">
                  {!showDeleteConfirm ? (
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="w-full py-3.5 bg-red-50 text-red-600 rounded-xl font-medium hover:bg-red-100 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                    >
                      <Trash2 size={18} />
                      Delete Wallet
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm text-center text-red-600 font-medium">
                        Are you sure? This cannot be undone.
                      </p>
                      <div className="flex gap-3">
                        <button
                          onClick={() => setShowDeleteConfirm(false)}
                          disabled={isPending}
                          className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleDelete}
                          disabled={isPending}
                          className="flex-1 py-3 bg-red-600 text-white rounded-xl font-medium shadow-sm flex items-center justify-center hover:bg-red-700 transition-colors"
                        >
                          {isPending ? (
                            <Loader2 size={18} className="animate-spin" />
                          ) : (
                            "Yes, Delete"
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Category Manager Sheet */}
      <CategoryManagerSheet
        isOpen={showCategoryManager}
        onClose={() => {
          setShowCategoryManager(false);
          router.refresh();
        }}
        categories={categories}
      />

      {/* Balance Adjustment Modal */}
      <BalanceAdjustmentModal
        isOpen={Boolean(adjustingAccount)}
        account={adjustingAccount}
        onClose={() => setAdjustingAccount(null)}
        onSuccess={() => router.refresh()}
      />
    </div>
  );
}

function WalletRow({
  account,
  index,
  isEditing,
  isDragging,
  dragControls,
  onStartHold,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  onDragStart,
  onDrag,
  onDragEnd,
  onAdjust,
}: {
  account: AccountData;
  index: number;
  isEditing: boolean;
  isDragging: boolean;
  dragControls: DragControls;
  onStartHold: (id: string, e: React.PointerEvent, controls: DragControls) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: (id: string, account: AccountData, e?: React.PointerEvent) => void;
  onPointerCancel: () => void;
  onDragStart: (id: string) => void;
  onDrag: (id: string, point: { x: number; y: number }) => void;
  onDragEnd: () => void;
  onAdjust: () => void;
}) {
  return (
    <motion.div
      layout
      transition={{ layout: { type: "spring", stiffness: 320, damping: 30 } }}
      drag={isEditing}
      dragControls={dragControls}
      dragListener={isEditing}
      dragSnapToOrigin
      dragElastic={0.08}
      whileDrag={{
        scale: 1.015,
        zIndex: 50,
        boxShadow: "0 12px 28px rgba(0,0,0,0.14)",
      }}
      onDragStart={() => onDragStart(account.id)}
      onDrag={(event, info) => {
        let clientX = info.point.x;
        let clientY = info.point.y;
        if (event && "clientX" in event && typeof (event as MouseEvent).clientX === "number") {
          clientX = (event as MouseEvent).clientX;
          clientY = (event as MouseEvent).clientY;
        } else if (event && "touches" in event && (event as TouchEvent).touches?.length > 0) {
          clientX = (event as TouchEvent).touches[0].clientX;
          clientY = (event as TouchEvent).touches[0].clientY;
        }
        onDrag(account.id, { x: clientX, y: clientY });
      }}
      onDragEnd={onDragEnd}
      onPointerDown={(e) => onStartHold(account.id, e, dragControls)}
      onPointerMove={onPointerMove}
      onPointerUp={(e) => onPointerUp(account.id, account, e)}
      onPointerCancel={onPointerCancel}
      animate={
        isEditing && !isDragging
          ? {
              rotate: [0, -0.35, 0.35, -0.35, 0],
              transition: {
                repeat: Infinity,
                duration: 0.5,
                ease: "easeInOut",
                delay: (index % 3) * 0.03,
              },
            }
          : { rotate: 0, transition: { duration: 0.2, ease: "easeOut" } }
      }
      className={cn(
        "relative rounded-2xl touch-none select-none will-change-transform",
        isEditing || isDragging
          ? "ring-2 ring-emerald-400/50 shadow-sm"
          : "ring-0 ring-transparent",
      )}
      style={{ transition: "box-shadow 0.2s ease, ring 0.2s ease" } as React.CSSProperties}
    >
      <div className="relative flex items-center">
        <AnimatePresence>
          {isEditing && (
            <motion.div
              key="grip"
              initial={{ opacity: 0, x: -8, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -8, scale: 0.9 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="absolute left-[5px] top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            >
              <GripVertical size={16} />
            </motion.div>
          )}
        </AnimatePresence>
        <motion.div
          className="flex-1"
          animate={{ paddingLeft: isEditing ? 24 : 0 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        >
          <AccountCard
            id={account.id}
            name={account.name}
            type={account.type}
            balance={account.balance}
            onClick={() => {}}
            onAdjust={onAdjust}
          />
        </motion.div>
      </div>
    </motion.div>
  );
}

"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Trash2, Pencil, X, Loader2 } from "lucide-react";
import { deleteTransaction } from "@/app/actions/transactions";
import { useRouter } from "next/navigation";
import { formatCurrency, formatDate } from "@/lib/utils";
import { CategoryIcon } from "@/constants/categories";

interface TransactionDetailSheetProps {
  transaction: {
    id: string;
    type: "income" | "expense";
    amount: number;
    note: string | null;
    transaction_date: string;
    categories: { name: string; icon: string; color: string; scope?: string } | null;
    accounts: { name: string } | null;
  } | null;
  isOpen: boolean;
  onClose: () => void;
  onDelete?: (id: string) => void;
}

export function TransactionDetailSheet({
  transaction,
  isOpen,
  onClose,
  onDelete,
}: TransactionDetailSheetProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Keep reference to last active transaction so exit animation renders smoothly even if parent clears transaction
  const lastTxRef = useRef(transaction);
  if (transaction) {
    lastTxRef.current = transaction;
  }
  const currentTx = transaction || lastTxRef.current;

  const handleDelete = async () => {
    if (!currentTx) return;
    setDeleting(true);
    try {
      await deleteTransaction(currentTx.id);
      onDelete?.(currentTx.id);
      onClose();
      router.refresh();
    } catch (err) {
      console.error("Failed to delete transaction:", err);
      setDeleting(false);
      setShowConfirm(false);
    } finally {
      setDeleting(false);
      setShowConfirm(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && currentTx && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4">
          {/* Fast Lightweight Backdrop (same as Manage Categories) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            onClick={onClose}
          />

          {/* Snappy Lightweight Sheet (same as Manage Categories) */}
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.99 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 w-full max-w-[430px] bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl px-6 pt-3 pb-[max(env(safe-area-inset-bottom,0px),1.5rem)] sm:pb-6 max-h-[85vh] overflow-y-auto"
          >
            {/* Handle bar */}
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4 sm:hidden" />

            {/* Header */}
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center"
                  style={{
                    backgroundColor: `${currentTx.categories?.color ?? "#6B7280"}15`,
                  }}
                >
                  <CategoryIcon
                    name={currentTx.categories?.icon ?? "Package"}
                    size={24}
                    style={{ color: currentTx.categories?.color ?? "#6B7280" }}
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-lg text-gray-900">
                      {currentTx.categories?.name ?? "Unknown"}
                    </h3>
                    {currentTx.categories?.scope === "business" && (
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                        Business
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">
                    {currentTx.accounts?.name ?? "Unknown Account"}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="min-h-[44px] min-w-[44px] -mr-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            {/* Amount */}
            <div className="text-center mb-5">
              <p
                className={`text-3xl font-bold ${
                  currentTx.type === "income"
                    ? "text-emerald-500"
                    : "text-red-500"
                }`}
              >
                {currentTx.type === "income" ? "+" : "-"}
                {formatCurrency(Number(currentTx.amount))}
              </p>
              <p className="text-sm text-gray-400 mt-1">
                {formatDate(currentTx.transaction_date)}
              </p>
            </div>

            {/* Note */}
            {currentTx.note && (
              <div className="bg-gray-50 rounded-2xl p-3.5 mb-5 border border-gray-100">
                <p className="text-xs text-gray-400 font-medium mb-1">Note</p>
                <p className="text-sm text-gray-700 break-words">
                  {currentTx.note}
                </p>
              </div>
            )}

            {/* Actions */}
            {showConfirm ? (
              <div className="space-y-3 pt-1">
                <p className="text-center text-sm text-gray-600 mb-2 font-medium">
                  Are you sure you want to delete this transaction?
                </p>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="w-full min-h-[48px] py-3 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-60"
                >
                  {deleting ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Trash2 size={18} />
                  )}
                  <span>{deleting ? "Deleting..." : "Yes, Delete"}</span>
                </button>
                <button
                  onClick={() => setShowConfirm(false)}
                  disabled={deleting}
                  className="w-full min-h-[44px] py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl font-bold text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() =>
                    router.push(`/transactions/${currentTx.id}/edit`)
                  }
                  className="flex-1 min-h-[48px] py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
                >
                  <Pencil size={18} />
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => setShowConfirm(true)}
                  className="flex-1 min-h-[48px] py-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 border border-red-100 transition-colors cursor-pointer"
                >
                  <Trash2 size={18} />
                  <span>Delete</span>
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

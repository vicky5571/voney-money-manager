'use client';

import { useState } from 'react';
import { Trash2, Pencil, X, Loader2 } from 'lucide-react';
import { deleteTransaction } from '@/app/actions/transactions';
import { useRouter } from 'next/navigation';
import { formatCurrency, formatDate } from '@/lib/utils';
import { getCategoryIcon } from '@/constants/categories';

interface TransactionDetailSheetProps {
  transaction: {
    id: string;
    type: 'income' | 'expense';
    amount: number;
    note: string | null;
    transaction_date: string;
    categories: { name: string; icon: string; color: string } | null;
    accounts: { name: string } | null;
  };
  isOpen: boolean;
  onClose: () => void;
}

export function TransactionDetailSheet({
  transaction,
  isOpen,
  onClose,
}: TransactionDetailSheetProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  if (!isOpen) return null;

  const Icon = getCategoryIcon(transaction.categories?.icon ?? 'Package');

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteTransaction(transaction.id);
      onClose();
      router.refresh();
    } catch (err) {
      console.error('Failed to delete transaction:', err);
    } finally {
      setDeleting(false);
      setShowConfirm(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl px-6 pt-6 pb-8 safe-bottom max-w-[430px] mx-auto animate-slide-up">
        {/* Handle bar */}
        <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-6" />

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ backgroundColor: `${transaction.categories?.color ?? '#6B7280'}15` }}
            >
              <Icon
                size={24}
                style={{ color: transaction.categories?.color ?? '#6B7280' }}
              />
            </div>
            <div>
              <h3 className="font-semibold text-lg">
                {transaction.categories?.name ?? 'Unknown'}
              </h3>
              <p className="text-sm text-gray-500">
                {transaction.accounts?.name ?? 'Unknown Account'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        {/* Amount */}
        <div className="text-center mb-6">
          <p
            className={`text-3xl font-bold ${
              transaction.type === 'income' ? 'text-emerald-600' : 'text-red-500'
            }`}
          >
            {transaction.type === 'income' ? '+' : '-'}
            {formatCurrency(Number(transaction.amount))}
          </p>
          <p className="text-sm text-gray-400 mt-1">
            {formatDate(transaction.transaction_date)}
          </p>
        </div>

        {/* Note */}
        {transaction.note && (
          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <p className="text-xs text-gray-400 mb-1">Note</p>
            <p className="text-sm text-gray-700">{transaction.note}</p>
          </div>
        )}

        {/* Actions */}
        {showConfirm ? (
          <div className="space-y-3">
            <p className="text-center text-sm text-gray-600 mb-2">
              Are you sure you want to delete this transaction?
            </p>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="w-full py-3 bg-red-500 text-white rounded-xl font-medium flex items-center justify-center gap-2"
            >
              {deleting ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Trash2 size={18} />
              )}
              {deleting ? 'Deleting...' : 'Yes, Delete'}
            </button>
            <button
              onClick={() => setShowConfirm(false)}
              className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-medium"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex gap-3">
            <button
              onClick={() =>
                router.push(`/transactions/${transaction.id}/edit`)
              }
              className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-indigo-700 transition-colors"
            >
              <Pencil size={18} />
              Edit
            </button>
            <button
              onClick={() => setShowConfirm(true)}
              className="flex-1 py-3 bg-red-50 text-red-600 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-red-100 transition-colors"
            >
              <Trash2 size={18} />
              Delete
            </button>
          </div>
        )}
      </div>
    </>
  );
}

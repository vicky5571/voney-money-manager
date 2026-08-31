'use client';

import { useState, useTransition } from 'react';
import { X, SlidersHorizontal, AlertTriangle, ArrowDownRight, ArrowUpRight, Loader2 } from 'lucide-react';
import { adjustAccountBalance } from '@/app/actions/accounts';
import { getOfflineQueueCount } from '@/lib/offline-sync';
import { formatCurrency, cn } from '@/lib/utils';
import type { AccountData } from '@/components/accounts-client';

interface BalanceAdjustmentModalProps {
  account: AccountData | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface FormContentProps {
  account: AccountData;
  onClose: () => void;
  onSuccess?: () => void;
}

function BalanceAdjustmentContent({ account, onClose, onSuccess }: FormContentProps) {
  const [newBalanceInput, setNewBalanceInput] = useState(() => account.balance.toString());
  const [noteInput, setNoteInput] = useState('');
  const [error, setError] = useState('');
  const [offlineCount] = useState<number>(() =>
    typeof window !== 'undefined' ? getOfflineQueueCount() : 0
  );
  const [isPending, startTransition] = useTransition();

  const currentBalance = account.balance;
  const parsedNewBalance = parseFloat(newBalanceInput);
  const isValidNumber = !isNaN(parsedNewBalance) && parsedNewBalance >= 0;
  const difference = isValidNumber ? Number((parsedNewBalance - currentBalance).toFixed(2)) : 0;
  const isDeduction = difference < 0;
  const hasChanged = isValidNumber && Math.abs(difference) >= 0.01;

  const handleConfirm = () => {
    if (!isValidNumber) {
      setError('Please enter a valid positive balance.');
      return;
    }
    if (!hasChanged) {
      onClose();
      return;
    }

    setError('');
    startTransition(async () => {
      try {
        await adjustAccountBalance(account.id, parsedNewBalance, noteInput);
        onSuccess?.();
        onClose();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to adjust balance');
      }
    });
  };

  return (
    <div className="relative w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <SlidersHorizontal size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Adjust Balance</h2>
            <p className="text-xs text-gray-500 font-medium">{account.name}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 -mr-2 text-gray-400 hover:text-gray-600 min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
          aria-label="Close"
        >
          <X size={20} />
        </button>
      </div>

      {/* Offline Warning Banner */}
      {offlineCount > 0 && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-2 text-amber-800 text-xs">
          <AlertTriangle size={16} className="shrink-0 mt-0.5 text-amber-600" />
          <p>
            You have <span className="font-bold">{offlineCount} offline item(s)</span> pending. Sync them first to avoid overwriting recent changes.
          </p>
        </div>
      )}

      {/* Current Balance Display */}
      <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-100 mb-4 flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-500">Current Registered Balance</span>
        <span className="text-sm font-bold text-gray-900">{formatCurrency(currentBalance)}</span>
      </div>

      {/* New Balance Input */}
      <div className="space-y-3 mb-4">
        <div>
          <label htmlFor="new-balance-input" className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">
            Actual Current Balance
          </label>
          <div className="relative">
            <input
              id="new-balance-input"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              value={newBalanceInput}
              onChange={(e) => {
                setNewBalanceInput(e.target.value);
                setError('');
              }}
              placeholder="0.00"
              className="w-full text-xl font-bold px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-600 focus:border-transparent outline-none transition-all"
              autoFocus
            />
          </div>
        </div>

        {/* Difference & Classification Callout */}
        {hasChanged && (
          <div
            className={cn(
              'p-3.5 rounded-2xl border flex items-start gap-2.5 transition-all text-xs',
              isDeduction
                ? 'bg-amber-50/80 border-amber-200 text-amber-900'
                : 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
            )}
          >
            {isDeduction ? (
              <ArrowDownRight size={18} className="shrink-0 text-red-500 mt-0.5" />
            ) : (
              <ArrowUpRight size={18} className="shrink-0 text-emerald-600 mt-0.5" />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold">
                  {isDeduction ? 'Deduction' : 'Addition'}: {isDeduction ? '-' : '+'}{formatCurrency(Math.abs(difference))}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/80 border border-current">
                  {isDeduction ? 'Untracked Expense' : 'Untracked Income'}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-gray-600 leading-relaxed">
                An adjustment transaction will be recorded to reconcile your records without penalizing your category budget limits.
              </p>
            </div>
          </div>
        )}

        {/* Optional Note */}
        <div>
          <label htmlFor="note-input" className="block text-xs font-semibold text-gray-600 mb-1">
            Note (Optional)
          </label>
          <input
            id="note-input"
            type="text"
            value={noteInput}
            onChange={(e) => setNoteInput(e.target.value)}
            placeholder="e.g. Cash count discrepancy, untracked coffee"
            className="w-full text-xs px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:border-transparent outline-none transition-all"
          />
        </div>
      </div>

      {error && <p className="text-red-500 text-xs font-medium mb-3">{error}</p>}

      {/* Buttons */}
      <div className="flex gap-2.5 pt-2">
        <button
          type="button"
          onClick={onClose}
          disabled={isPending}
          className="flex-1 min-h-[44px] py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl text-xs font-bold transition-colors cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={isPending || !hasChanged}
          className="flex-1 min-h-[44px] py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.98] cursor-pointer"
        >
          {isPending ? <Loader2 size={16} className="animate-spin" /> : 'Confirm Adjustment'}
        </button>
      </div>
    </div>
  );
}

export function BalanceAdjustmentModal({
  account,
  isOpen,
  onClose,
  onSuccess,
}: BalanceAdjustmentModalProps) {
  if (!isOpen || !account) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onClose} />
      <BalanceAdjustmentContent
        key={`${account.id}-${account.balance}`}
        account={account}
        onClose={onClose}
        onSuccess={onSuccess}
      />
    </div>
  );
}

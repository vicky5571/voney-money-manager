'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Calendar, ArrowRightLeft, Keyboard, Calculator } from 'lucide-react';
import Link from 'next/link';
import { createTransaction, createTransfer } from '@/app/actions/transactions';
import { getCategories } from '@/app/actions/categories';
import { getAccounts } from '@/app/actions/accounts';
import { CategoryGrid } from '@/components/category-grid';
import { SpeedKeypad } from '@/components/speed-keypad';
import { CategoryManagerSheet } from '@/components/category-manager-sheet';
import { saveOfflineTransaction, saveOfflineTransfer } from '@/lib/offline-sync';
import { useAppStore } from '@/lib/store/use-app-store';
import { formatCurrency, cn } from '@/lib/utils';

type Category = {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: string;
};

type Account = {
  id: string;
  name: string;
  type: string;
  balance: number;
};

export default function AddTransactionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState('');

  // Form state
  const [type, setType] = useState<'expense' | 'income' | 'transfer'>('expense');
  const [amount, setAmount] = useState('');
  const [showKeypad, setShowKeypad] = useState(true);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [toAccount, setToAccount] = useState<string>('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');

  // Data
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const { optimisticAddTransaction } = useAppStore();

  useEffect(() => {
    async function loadData() {
      try {
        const [cats, accs] = await Promise.all([getCategories(), getAccounts()]);
        setCategories(cats as Category[]);
        setAccounts(accs as Account[]);
        if (accs.length > 0) {
          setSelectedAccount(accs[0].id);
          if (accs.length > 1) {
            setToAccount(accs[1].id);
          } else {
            setToAccount(accs[0].id);
          }
        }
      } catch {
        setError('Failed to load data');
      } finally {
        setDataLoading(false);
      }
    }
    loadData();
  }, []);

  const filteredCategories = categories.filter((c) => c.type === type);

  // Parse amount evaluating any pending simple math
  const getNumericAmount = (val: string): number => {
    try {
      const cleaned = val.replace(/[+\-\.]$/, '').trim();
      if (!cleaned) return 0;
      const tokens = cleaned.match(/(\d+(\.\d+)?|[+\-])/g);
      if (!tokens || tokens.length === 0) return 0;
      let total = 0;
      let currentOp = '+';
      for (const token of tokens) {
        if (token === '+' || token === '-') {
          currentOp = token;
        } else {
          const num = parseFloat(token);
          if (!isNaN(num)) {
            if (currentOp === '+') total += num;
            else if (currentOp === '-') total -= num;
          }
        }
      }
      return total > 0 ? total : 0;
    } catch {
      return parseFloat(val) || 0;
    }
  };

  const parsedAmount = getNumericAmount(amount);

  const isValid =
    type === 'transfer'
      ? parsedAmount > 0 && selectedAccount && toAccount && selectedAccount !== toAccount && date
      : parsedAmount > 0 && selectedCategory && selectedAccount && date;

  const handleSubmit = async () => {
    if (!isValid) return;
    setLoading(true);
    setError('');

    // If device is explicitly offline, save to local queue immediately
    if (typeof window !== 'undefined' && !navigator.onLine) {
      try {
        if (type === 'transfer') {
          saveOfflineTransfer({
            from_account_id: selectedAccount,
            to_account_id: toAccount,
            amount: parsedAmount,
            transaction_date: date,
            note: note || undefined,
          });
        } else {
          saveOfflineTransaction({
            type,
            amount: parsedAmount,
            category_id: selectedCategory!,
            account_id: selectedAccount,
            transaction_date: date,
            note: note || undefined,
          });
        }
        router.push('/');
        return;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save offline');
        setLoading(false);
        return;
      }
    }

    try {
      const selCat = categories.find((c) => c.id === selectedCategory);
      const selAcc = accounts.find((a) => a.id === selectedAccount);
      if (type !== 'transfer' && selCat && selAcc) {
        optimisticAddTransaction({
          type,
          amount: parsedAmount,
          note: note || null,
          transaction_date: date,
          categories: {
            id: selCat.id,
            name: selCat.name,
            icon: selCat.icon,
            color: selCat.color,
          },
          accounts: {
            id: selAcc.id,
            name: selAcc.name,
          },
        });
      }

      if (type === 'transfer') {
        await createTransfer({
          from_account_id: selectedAccount,
          to_account_id: toAccount,
          amount: parsedAmount,
          transaction_date: date,
          note: note || undefined,
        });
      } else {
        await createTransaction({
          type,
          amount: parsedAmount,
          category_id: selectedCategory!,
          account_id: selectedAccount,
          transaction_date: date,
          note: note || undefined,
        });
      }
      router.push('/');
      router.refresh();
    } catch (err) {
      // Fallback: If network drops mid-flight, store offline
      if (typeof window !== 'undefined' && !navigator.onLine) {
        if (type === 'transfer') {
          saveOfflineTransfer({
            from_account_id: selectedAccount,
            to_account_id: toAccount,
            amount: parsedAmount,
            transaction_date: date,
            note: note || undefined,
          });
        } else {
          saveOfflineTransaction({
            type,
            amount: parsedAmount,
            category_id: selectedCategory!,
            account_id: selectedAccount,
            transaction_date: date,
            note: note || undefined,
          });
        }
        router.push('/');
        return;
      }
      setError(err instanceof Error ? err.message : 'Failed to save transaction');
    } finally {
      setLoading(false);
    }
  };

  if (dataLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="px-4 pt-4 pb-28 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <Link
          href="/"
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
          aria-label="Back to dashboard"
        >
          <ArrowLeft size={20} className="text-gray-700" />
        </Link>
        <h1 className="text-xl font-bold text-gray-900">
          {type === 'transfer' ? 'Transfer Money' : 'Add Transaction'}
        </h1>
      </div>

      {/* 3-Way Type toggle */}
      <div className="flex bg-gray-100 rounded-2xl p-1 mb-5">
        <button
          type="button"
          onClick={() => {
            setType('expense');
            setSelectedCategory(null);
          }}
          className={cn(
            'flex-1 min-h-[44px] py-2 rounded-xl text-xs font-bold transition-all',
            type === 'expense' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
          )}
        >
          Expense
        </button>
        <button
          type="button"
          onClick={() => {
            setType('income');
            setSelectedCategory(null);
          }}
          className={cn(
            'flex-1 min-h-[44px] py-2 rounded-xl text-xs font-bold transition-all',
            type === 'income' ? 'bg-white text-emerald-500 shadow-sm' : 'text-gray-600 hover:text-gray-900'
          )}
        >
          Income
        </button>
        <button
          type="button"
          onClick={() => {
            setType('transfer');
            setSelectedCategory(null);
          }}
          className={cn(
            'flex-1 min-h-[44px] py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1',
            type === 'transfer' ? 'bg-white text-emerald-500 shadow-sm' : 'text-gray-600 hover:text-gray-900'
          )}
        >
          <ArrowRightLeft size={13} /> Transfer
        </button>
      </div>

      {/* Amount input & Keypad */}
      <div className="mb-5 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
            Amount
          </label>
          <button
            type="button"
            onClick={() => setShowKeypad(!showKeypad)}
            className="min-h-[44px] px-2 text-xs font-semibold text-emerald-500 hover:text-emerald-500 flex items-center gap-1"
          >
            {showKeypad ? <Keyboard size={15} /> : <Calculator size={15} />}
            <span>{showKeypad ? 'Use Standard Input' : 'Use Speed Keypad'}</span>
          </button>
        </div>

        <div className="relative">
          <input
            type={showKeypad ? 'text' : 'number'}
            readOnly={showKeypad}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full px-4 py-3.5 text-3xl font-extrabold bg-gray-50 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 tracking-tight"
            inputMode="decimal"
            aria-label="Amount"
            aria-live="polite"
          />
          {parsedAmount > 0 && amount !== parsedAmount.toString() && (
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-emerald-500 bg-emerald-50 px-2 py-1 rounded-lg">
              = {formatCurrency(parsedAmount)}
            </span>
          )}
        </div>

        {/* Speed Keypad */}
        {showKeypad && (
          <SpeedKeypad
            value={amount}
            onChange={setAmount}
            onDone={() => setShowKeypad(false)}
          />
        )}
      </div>

      {/* Transfer: Source & Destination Wallets */}
      {type === 'transfer' ? (
        <div className="mb-5 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 block">
              From Wallet (Source)
            </label>
            <select
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
              className="w-full min-h-[48px] px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({formatCurrency(Number(acc.balance))})
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-center -my-1">
            <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center">
              <ArrowRightLeft size={16} className="rotate-90" />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 block">
              To Wallet (Destination)
            </label>
            <select
              value={toAccount}
              onChange={(e) => setToAccount(e.target.value)}
              className="w-full min-h-[48px] px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({formatCurrency(Number(acc.balance))})
                </option>
              ))}
            </select>
          </div>

          {selectedAccount === toAccount && (
            <p className="text-xs text-red-500 font-semibold">
              Source and destination wallets must be different.
            </p>
          )}
        </div>
      ) : (
        <>
          {/* Category selector */}
          <div className="mb-5 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-500 block">
              Category
            </label>
            <CategoryGrid
              categories={filteredCategories.map((c) => ({
                id: c.id,
                name: c.name,
                icon: c.icon,
                color: c.color,
              }))}
              selectedId={selectedCategory}
              onSelect={setSelectedCategory}
              onManageCategories={() => setShowCategoryManager(true)}
            />
          </div>

          {/* Account selector */}
          <div className="mb-5 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-500 block">
              Account / Wallet
            </label>
            {accounts.length === 0 ? (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-center space-y-2">
                <p className="text-xs font-bold text-amber-900">No Wallets Found</p>
                <p className="text-xs text-amber-700">Please create a wallet first before adding transactions.</p>
                <Link
                  href="/accounts"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-sm"
                >
                  + Add Wallet
                </Link>
              </div>
            ) : (
              <select
                value={selectedAccount}
                onChange={(e) => setSelectedAccount(e.target.value)}
                className="w-full min-h-[48px] px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({formatCurrency(Number(acc.balance))})
                  </option>
                ))}
              </select>
            )}
          </div>
        </>
      )}

      {/* Date picker */}
      <div className="mb-5 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-2">
        <label className="text-xs font-bold uppercase tracking-wider text-gray-500 block">
          Date
        </label>
        <div className="relative">
          <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full min-h-[48px] pl-10 pr-4 py-3 bg-gray-50 rounded-xl border border-gray-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
          />
        </div>
      </div>

      {/* Note */}
      <div className="mb-6 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-2">
        <label className="text-xs font-bold uppercase tracking-wider text-gray-500 block">
          Note <span className="text-gray-400 font-normal lowercase">(optional)</span>
        </label>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={type === 'transfer' ? 'e.g. ATM withdrawal, rent share' : 'Add a note...'}
          maxLength={200}
          className="w-full min-h-[48px] px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        {note.length > 0 && (
          <p className="text-xs text-gray-500 mt-1 text-right">
            {note.length}/200
          </p>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3.5 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs font-semibold">
          {error}
        </div>
      )}

      {/* Save button */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!isValid || loading}
        className="w-full min-h-[52px] py-4 bg-emerald-500 text-white rounded-2xl font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-emerald-500 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-md shadow-emerald-200"
      >
        {loading ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            Saving...
          </>
        ) : type === 'transfer' ? (
          'Confirm Transfer'
        ) : (
          'Save Transaction'
        )}
      </button>

      {/* Category Manager Sheet */}
      <CategoryManagerSheet
        isOpen={showCategoryManager}
        onClose={() => setShowCategoryManager(false)}
        categories={categories}
        onCategoryCreated={(newCat) => {
          setCategories((prev) => [...prev, newCat as Category]);
          setSelectedCategory(newCat.id);
          setShowCategoryManager(false);
        }}
      />
    </div>
  );
}

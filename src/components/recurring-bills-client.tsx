'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  X,
  Trash2,
  Edit2,
  Calendar,
  CheckCircle2,
  Clock,
  Loader2,
  Repeat,
  DollarSign,
} from 'lucide-react';
import {
  createRecurringBill,
  updateRecurringBill,
  deleteRecurringBill,
  payRecurringBill,
  type RecurringBillData,
} from '@/app/actions/recurring';
import { CategoryIcon } from '@/constants/categories';
import { formatCurrency, formatDate, cn } from '@/lib/utils';

export interface RecurringAccountItem {
  id: string;
  name: string;
  type: string;
  balance: number;
}

export interface RecurringCategoryItem {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: string;
}

interface RecurringBillsClientProps {
  bills: RecurringBillData[];
  accounts: RecurringAccountItem[];
  categories: RecurringCategoryItem[];
}

export function RecurringBillsClient({
  bills,
  accounts,
  categories,
}: RecurringBillsClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [mode, setMode] = useState<'create' | 'edit' | null>(null);
  const [selectedBill, setSelectedBill] = useState<RecurringBillData | null>(null);
  const [payingBillId, setPayingBillId] = useState<string | null>(null);
  const [error, setError] = useState('');

  // Form states
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [categoryId, setCategoryId] = useState(categories[0]?.id || '');
  const [frequency, setFrequency] = useState<'monthly' | 'weekly' | 'yearly'>('monthly');
  const [dueDay, setDueDay] = useState(1);
  const [nextDueDate, setNextDueDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [note, setNote] = useState('');

  const totalMonthlyCommitment = bills
    .filter((b) => b.is_active)
    .reduce((sum, b) => {
      if (b.frequency === 'weekly') return sum + b.amount * 4.33;
      if (b.frequency === 'yearly') return sum + b.amount / 12;
      return sum + b.amount;
    }, 0);

  const openCreate = () => {
    setName('');
    setAmount('');
    if (accounts.length > 0) setAccountId(accounts[0].id);
    if (categories.length > 0) setCategoryId(categories[0].id);
    setFrequency('monthly');
    setDueDay(1);
    setNextDueDate(new Date().toISOString().split('T')[0]);
    setNote('');
    setError('');
    setMode('create');
  };

  const openEdit = (bill: RecurringBillData) => {
    setSelectedBill(bill);
    setName(bill.name);
    setAmount(bill.amount.toString());
    setAccountId(bill.accounts?.id || accounts[0]?.id || '');
    setCategoryId(bill.categories?.id || categories[0]?.id || '');
    setFrequency(bill.frequency);
    setDueDay(bill.due_day);
    setNextDueDate(bill.next_due_date);
    setNote(bill.note || '');
    setError('');
    setMode('edit');
  };

  const handleSave = () => {
    if (!name.trim()) {
      setError('Please enter a bill/subscription name');
      return;
    }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setError('');
    startTransition(async () => {
      try {
        if (mode === 'create') {
          await createRecurringBill({
            name: name.trim(),
            amount: numAmount,
            account_id: accountId,
            category_id: categoryId,
            frequency,
            due_day: Number(dueDay),
            next_due_date: nextDueDate,
            note: note || undefined,
          });
        } else if (mode === 'edit' && selectedBill) {
          await updateRecurringBill(selectedBill.id, {
            name: name.trim(),
            amount: numAmount,
            account_id: accountId,
            category_id: categoryId,
            frequency,
            due_day: Number(dueDay),
            next_due_date: nextDueDate,
            is_active: selectedBill.is_active,
            note: note || undefined,
          });
        }
        setMode(null);
        router.refresh();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to save recurring bill');
      }
    });
  };

  const handleDelete = (id: string) => {
    setError('');
    startTransition(async () => {
      try {
        await deleteRecurringBill(id);
        setMode(null);
        router.refresh();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to delete bill');
      }
    });
  };

  const handlePay = (bill: RecurringBillData) => {
    setPayingBillId(bill.id);
    startTransition(async () => {
      try {
        await payRecurringBill(bill.id);
        router.refresh();
      } catch (err: unknown) {
        console.error('Failed to mark as paid:', err);
      } finally {
        setPayingBillId(null);
      }
    });
  };

  return (
    <div className="px-4 pt-6 pb-28 max-w-md mx-auto space-y-6">
      {/* Header Summary Card */}
      <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-3xl p-6 text-white shadow-md space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-200">
            Recurring Bills & Subs
          </span>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/20 text-white font-bold backdrop-blur-sm">
            {bills.filter((b) => b.is_active).length} Active
          </span>
        </div>
        <div>
          <p className="text-xs text-indigo-100 font-medium">Est. Monthly Total</p>
          <p className="text-3xl font-extrabold tracking-tight mt-0.5">
            {formatCurrency(totalMonthlyCommitment)}
          </p>
        </div>
      </div>

      {/* Title & Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-gray-900">Your Subscriptions</h2>
          <p className="text-xs text-gray-500 font-medium">Track due dates & auto-advance</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="min-h-[44px] px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
        >
          <Plus size={16} /> Add Subscription
        </button>
      </div>

      {/* List of Recurring Bills */}
      {bills.length === 0 ? (
        <div className="py-12 px-4 bg-gray-50 rounded-3xl border border-dashed border-gray-200 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
            <Repeat size={24} />
          </div>
          <h3 className="text-sm font-bold text-gray-800">No subscriptions tracked yet</h3>
          <p className="text-xs text-gray-500 max-w-xs mx-auto">
            Track Netflix, Spotify, gym, rent, or WiFi to never miss a due date.
          </p>
          <button
            type="button"
            onClick={openCreate}
            className="min-h-[44px] px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl shadow-sm hover:bg-indigo-700"
          >
            Add First Bill
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {bills.map((bill) => {
            const dueDate = new Date(bill.next_due_date + 'T00:00:00');
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const diffDays = Math.ceil(
              (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
            );
            const isDueSoon = diffDays <= 3 && diffDays >= 0;
            const isOverdue = diffDays < 0;

            return (
              <div
                key={bill.id}
                className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm space-y-3 transition-all hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
                      style={{
                        backgroundColor: `${bill.categories?.color ?? '#6366f1'}1A`,
                      }}
                    >
                      <CategoryIcon
                        name={bill.categories?.icon ?? 'Repeat'}
                        size={22}
                        style={{ color: bill.categories?.color ?? '#6366f1' }}
                      />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-gray-900 truncate">{bill.name}</h3>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-600">
                          {bill.frequency}
                        </span>
                        {bill.accounts && (
                          <span className="text-[10px] font-medium text-gray-500 truncate">
                            • {bill.accounts.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-sm font-extrabold text-gray-900">
                      {formatCurrency(bill.amount)}
                    </p>
                    <span
                      className={cn(
                        'text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mt-0.5',
                        isOverdue
                          ? 'bg-red-50 text-red-600'
                          : isDueSoon
                          ? 'bg-amber-50 text-amber-700 font-extrabold'
                          : 'bg-gray-50 text-gray-500'
                      )}
                    >
                      {isOverdue
                        ? 'Overdue'
                        : isDueSoon
                        ? diffDays === 0
                          ? 'Due Today!'
                          : `Due in ${diffDays}d`
                        : `Due ${formatDate(bill.next_due_date)}`}
                    </span>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                  <div className="flex items-center gap-1 text-[11px] text-gray-400">
                    {bill.last_paid_date ? (
                      <span className="flex items-center gap-1 text-emerald-600 font-medium">
                        <CheckCircle2 size={13} /> Paid on {formatDate(bill.last_paid_date)}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <Clock size={13} /> Not paid yet
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => openEdit(bill)}
                      className="min-h-[44px] min-w-[44px] p-2 text-gray-400 hover:text-indigo-600 flex items-center justify-center"
                      aria-label="Edit bill"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePay(bill)}
                      disabled={payingBillId === bill.id || isPending}
                      className="min-h-[44px] px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold flex items-center gap-1 active:scale-95 transition-all disabled:opacity-50"
                    >
                      {payingBillId === bill.id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <CheckCircle2 size={14} />
                      )}
                      Mark Paid
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Recurring Bill Modal */}
      {mode && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={() => setMode(null)} />
          <div className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom sm:zoom-in-95 duration-200 max-h-[88vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">
                {mode === 'create' ? 'Add Subscription' : 'Edit Subscription'}
              </h2>
              <button
                type="button"
                onClick={() => setMode(null)}
                className="min-h-[44px] min-w-[44px] -mr-2 text-gray-500 hover:text-gray-700 flex items-center justify-center"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            {/* Name */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5 block">
                Bill / Subscription Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Netflix, Apartment Rent, WiFi"
                maxLength={40}
                className="w-full min-h-[48px] px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Amount */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5 block">
                Amount
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  className="w-full min-h-[48px] pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Frequency */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5 block">
                Billing Cycle
              </label>
              <div className="flex gap-2">
                {(['monthly', 'weekly', 'yearly'] as const).map((freq) => (
                  <button
                    key={freq}
                    type="button"
                    onClick={() => setFrequency(freq)}
                    className={cn(
                      'flex-1 min-h-[44px] py-2 rounded-xl text-xs font-bold capitalize transition-all',
                      frequency === freq
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    )}
                  >
                    {freq}
                  </button>
                ))}
              </div>
            </div>

            {/* Next Due Date */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5 block">
                Next Due Date
              </label>
              <div className="relative">
                <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="date"
                  value={nextDueDate}
                  onChange={(e) => {
                    setNextDueDate(e.target.value);
                    const d = new Date(e.target.value);
                    if (!isNaN(d.getDate())) setDueDay(d.getDate());
                  }}
                  className="w-full min-h-[48px] pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5 block">
                Category
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full min-h-[48px] px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Payment Wallet Account */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5 block">
                Pay From Wallet
              </label>
              {accounts.length === 0 ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-center">
                  <p className="text-xs text-amber-700 font-semibold mb-1">No wallets found</p>
                  <a
                    href="/accounts"
                    className="inline-block text-xs font-bold text-indigo-600 underline"
                  >
                    + Create a wallet first
                  </a>
                </div>
              ) : (
                <select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="w-full min-h-[48px] px-4 py-3 bg-gray-50 border border-gray-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({formatCurrency(acc.balance)})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Note */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5 block">
                Note (Optional)
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Account #1234, renewal term"
                maxLength={100}
                className="w-full min-h-[48px] px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {error && (
              <p className="text-xs text-red-600 font-semibold p-2 bg-red-50 rounded-xl">
                {error}
              </p>
            )}

            <div className="flex gap-2 pt-2">
              {mode === 'edit' && selectedBill && (
                <button
                  type="button"
                  onClick={() => handleDelete(selectedBill.id)}
                  disabled={isPending}
                  className="min-h-[48px] px-4 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
                >
                  <Trash2 size={16} /> Delete
                </button>
              )}
              <button
                type="button"
                onClick={handleSave}
                disabled={isPending || !name.trim() || !amount}
                className="flex-1 min-h-[48px] py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {isPending ? <Loader2 size={16} className="animate-spin" /> : 'Save Subscription'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  Calendar,
  Keyboard,
  Calculator,
} from "lucide-react";
import Link from "next/link";
import {
  updateTransaction,
  getTransactionById,
} from "@/app/actions/transactions";
import { getCategories, reorderCategories } from "@/app/actions/categories";
import { getAccounts } from "@/app/actions/accounts";
import { CategoryGrid } from "@/components/category-grid";
import { CategoryManagerSheet } from "@/components/category-manager-sheet";
import { SpeedKeypad } from "@/components/speed-keypad";
import {
  formatCurrency,
  sortCategoriesByOrder,
  saveCategoryOrder,
  cn,
} from "@/lib/utils";

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

export default function EditTransactionPage() {
  const router = useRouter();
  const params = useParams();
  const transactionId = params.id as string;

  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState("");
  const [isTransfer, setIsTransfer] = useState(false);

  // Form state
  const [type, setType] = useState<"income" | "expense">("expense");
  const [amount, setAmount] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");
  const [isSettled, setIsSettled] = useState(true);

  // Data
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [showKeypad, setShowKeypad] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      try {
        const [cats, accs, transaction] = await Promise.all([
          getCategories(),
          getAccounts(),
          getTransactionById(transactionId),
        ]);
        if (cancelled) return;
        setCategories(sortCategoriesByOrder(cats as Category[]));
        setAccounts(accs as Account[]);

        if (transaction) {
          // Detect transfer transactions (created as paired expense+income with note prefix)
          const tNote = (transaction.note as string | null) ?? "";
          const transfer =
            tNote.startsWith("Transfer to") ||
            tNote.startsWith("Transfer from");
          if (transfer) {
            setIsTransfer(true);
          }
          // Defensive cast: DB guarantees income|expense, but be explicit
          const tType =
            transaction.type === "income" || transaction.type === "expense"
              ? transaction.type
              : "expense";
          setType(tType);
          // amount comes from DECIMAL(12,2) -> Supabase returns string or number
          setAmount(String(transaction.amount));
          setSelectedCategory(transaction.category_id);
          setSelectedAccount(transaction.account_id);
          setDate(transaction.transaction_date);
          setNote(transaction.note || "");
          setIsSettled(transaction.is_settled !== undefined ? Boolean(transaction.is_settled) : true);
        }
      } catch (err) {
        if (cancelled) return;
        const msg =
          err instanceof Error ? err.message : "Failed to load transaction";
        console.error("[edit-transaction] load failed", {
          transactionId,
          error: msg,
          err,
        });
        setError(msg);
      } finally {
        if (!cancelled) setDataLoading(false);
      }
    }
    loadData();
    return () => {
      cancelled = true;
    };
  }, [transactionId]);

  const filteredCategories = useMemo(
    () => sortCategoriesByOrder(categories.filter((c) => c.type === type)),
    [categories, type],
  );

  // Mirror add page's resilient amount parsing (handles trailing operators)
  const getNumericAmount = (val: string): number => {
    try {
      const cleaned = val.replace(/[+\-\.]$/, "").trim();
      if (!cleaned) return 0;
      const tokens = cleaned.match(/(\d+(\.\d+)?|[+\-])/g);
      if (!tokens || tokens.length === 0) return 0;
      let total = 0;
      let currentOp = "+";
      for (const token of tokens) {
        if (token === "+" || token === "-") {
          currentOp = token;
        } else {
          const num = parseFloat(token);
          if (!isNaN(num)) {
            if (currentOp === "+") total += num;
            else if (currentOp === "-") total -= num;
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
    !isTransfer &&
    parsedAmount > 0 &&
    selectedCategory &&
    selectedAccount &&
    date;

  const handleSubmit = async () => {
    if (!isValid) return;
    setLoading(true);
    setError("");

    try {
      // Diagnostic boundary: log what enters the server action
      console.debug("[edit-transaction] submitting", {
        transactionId,
        type,
        parsedAmount,
        category_id: selectedCategory,
        account_id: selectedAccount,
        transaction_date: date,
      });
      await updateTransaction(transactionId, {
        type,
        amount: parsedAmount,
        category_id: selectedCategory!,
        account_id: selectedAccount,
        transaction_date: date,
        note: note || undefined,
        is_settled: isSettled,
      });
      router.push("/transactions");
      router.refresh();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to update transaction";
      console.error("[edit-transaction] update failed", {
        transactionId,
        error: msg,
        err,
      });
      setError(msg);
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
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/transactions"
          className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-100 transition-colors min-h-[44px] min-w-[44px]"
          aria-label="Back to transactions"
        >
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-xl font-bold">Edit Transaction</h1>
      </div>

      {isTransfer && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl text-sm text-amber-800">
          <p className="font-semibold mb-1">Transfer transactions</p>
          <p className="text-xs leading-relaxed">
            This transaction was created as a transfer (a paired expense +
            income). Editing a single leg would corrupt the transfer. Please
            delete this transaction and create a new transfer from{" "}
            <Link href="/add" className="underline font-semibold">
              Add → Transfer
            </Link>
            .
          </p>
        </div>
      )}

      {/* Type toggle - disabled for transfers */}
      <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
        <button
          type="button"
          disabled={isTransfer}
          onClick={() => {
            setType("expense");
            setSelectedCategory(null);
          }}
          className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all min-h-[44px] ${
            type === "expense"
              ? "bg-white text-red-500 shadow-sm"
              : "text-gray-500"
          } ${isTransfer ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          Expense
        </button>
        <button
          type="button"
          disabled={isTransfer}
          onClick={() => {
            setType("income");
            setSelectedCategory(null);
          }}
          className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all min-h-[44px] ${
            type === "income"
              ? "bg-white text-emerald-500 shadow-sm"
              : "text-gray-500"
          } ${isTransfer ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          Income
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
            disabled={isTransfer}
            onClick={() => setShowKeypad(!showKeypad)}
            className="min-h-[44px] px-2 text-xs font-semibold text-emerald-500 hover:text-emerald-500 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {showKeypad ? <Keyboard size={15} /> : <Calculator size={15} />}
            <span>
              {showKeypad ? "Use Standard Input" : "Use Speed Keypad"}
            </span>
          </button>
        </div>

        <div className="relative">
          <input
            type={showKeypad ? "text" : "number"}
            readOnly={showKeypad}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            disabled={isTransfer}
            className="w-full px-4 py-3.5 text-3xl font-extrabold bg-gray-50 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 tracking-tight disabled:opacity-60"
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
        {showKeypad && !isTransfer && (
          <SpeedKeypad
            value={amount}
            onChange={setAmount}
            onDone={() => setShowKeypad(false)}
          />
        )}
      </div>

      {/* Category selector */}
      <div className="mb-5 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-3">
        <label className="text-xs font-bold uppercase tracking-wider text-gray-500 block">
          Category
        </label>
        <CategoryGrid
          key={type}
          categories={filteredCategories.map((c) => ({
            id: c.id,
            name: c.name,
            icon: c.icon,
            color: c.color,
          }))}
          selectedId={selectedCategory}
          onSelect={setSelectedCategory}
          onManageCategories={
            isTransfer ? undefined : () => setShowCategoryManager(true)
          }
          onReorder={
            isTransfer
              ? undefined
              : (reorderedItems) => {
                  const otherTypeCats = categories.filter(
                    (c) => c.type !== type,
                  );
                  const reorderedFull = reorderedItems
                    .map((item) => categories.find((c) => c.id === item.id))
                    .filter(Boolean) as Category[];
                  const updated =
                    type === "expense"
                      ? [...reorderedFull, ...otherTypeCats]
                      : [...otherTypeCats, ...reorderedFull];
                  setCategories(updated);
                  saveCategoryOrder(updated.map((c) => c.id));
                  reorderCategories(reorderedItems.map((c) => c.id)).catch(
                    () => {},
                  );
                }
          }
        />
      </div>

      {/* Account selector */}
      <div className="mb-6">
        <label className="text-sm font-medium text-gray-500 mb-2 block">
          Account
        </label>
        <select
          value={selectedAccount}
          onChange={(e) => setSelectedAccount(e.target.value)}
          disabled={isTransfer}
          className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none cursor-pointer min-h-[48px] disabled:opacity-60"
        >
          {accounts.map((acc) => (
            <option key={acc.id} value={acc.id}>
              {acc.name} ({formatCurrency(Number(acc.balance))})
            </option>
          ))}
        </select>
      </div>

      {/* Date picker */}
      <div className="mb-5 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-2">
        <label className="text-xs font-bold uppercase tracking-wider text-gray-500 block">
          Date
        </label>
        <div className="relative">
          <Calendar
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
            size={18}
          />
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            disabled={isTransfer}
            className="w-full min-h-[48px] pl-10 pr-4 py-3 bg-gray-50 rounded-xl border border-gray-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer disabled:opacity-60"
          />
        </div>
      </div>

      {/* Wallet Balance Impact / Settlement */}
      {!isTransfer && (
        <div className="mb-5 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-2.5">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500 block">
                Deduct Balance Now
              </label>
              <p className="text-[11px] text-gray-400 mt-0.5">
                {isSettled
                  ? date > new Date().toISOString().split("T")[0]
                    ? "Future Hold: Deduct wallet funds immediately upon saving"
                    : "Update wallet balance immediately upon saving"
                  : "Pending Settle: Keep wallet untouched until settled manually"}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={isSettled}
              onClick={() => setIsSettled(!isSettled)}
              className={cn(
                "min-w-[48px] h-7 rounded-full p-1 transition-colors relative inline-flex items-center cursor-pointer shrink-0 ml-3",
                isSettled ? "bg-emerald-500" : "bg-gray-300"
              )}
            >
              <span
                className={cn(
                  "w-5 h-5 rounded-full bg-white shadow-md transform transition-transform",
                  isSettled ? "translate-x-5" : "translate-x-0"
                )}
              />
            </button>
          </div>

          <div
            className={cn(
              "p-2.5 rounded-xl text-xs flex items-center gap-2 border transition-all",
              isSettled
                ? date > new Date().toISOString().split("T")[0]
                  ? "bg-purple-50 text-purple-800 border-purple-200/70"
                  : "bg-emerald-50 text-emerald-800 border-emerald-200/70"
                : "bg-amber-50 text-amber-800 border-amber-200/70"
            )}
          >
            {isSettled ? (
              date > new Date().toISOString().split("T")[0] ? (
                <>
                  <span className="font-bold shrink-0">⏳ Committed Hold:</span>
                  <span>Will deduct balance now even though date is in the future.</span>
                </>
              ) : (
                <>
                  <span className="font-bold shrink-0">✓ Instant:</span>
                  <span>Wallet balance will be adjusted immediately.</span>
                </>
              )
            ) : (
              <>
                <span className="font-bold shrink-0">🕒 Pending Settle:</span>
                <span>Wallet balance is untouched. You can deduct it manually anytime.</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Note */}
      <div className="mb-6 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-2">
        <label className="text-xs font-bold uppercase tracking-wider text-gray-500 block">
          Note{" "}
          <span className="text-gray-400 font-normal lowercase">
            (optional)
          </span>
        </label>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add a note..."
          maxLength={200}
          disabled={isTransfer}
          className="w-full min-h-[48px] px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60"
        />
        {note.length > 0 && (
          <p className="text-xs text-gray-500 mt-1 text-right">
            {note.length}/200
          </p>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm border border-red-200">
          {error}
        </div>
      )}

      {/* Save button */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!isValid || loading}
        className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-semibold text-base disabled:opacity-50 disabled:cursor-not-allowed hover:bg-emerald-600 active:scale-[0.98] transition-all flex items-center justify-center gap-2 min-h-[52px]"
      >
        {loading ? (
          <>
            <Loader2 size={20} className="animate-spin" />
            Updating...
          </>
        ) : (
          "Update Transaction"
        )}
      </button>

      {/* Category Manager Sheet */}
      <CategoryManagerSheet
        isOpen={showCategoryManager}
        onClose={() => setShowCategoryManager(false)}
        categories={categories}
        onCategoryReordered={(reordered) => {
          setCategories(reordered as Category[]);
        }}
        onCategoryCreated={(newCat) => {
          setCategories((prev) => [...prev, newCat as Category]);
          setSelectedCategory(newCat.id);
          setShowCategoryManager(false);
        }}
      />
    </div>
  );
}

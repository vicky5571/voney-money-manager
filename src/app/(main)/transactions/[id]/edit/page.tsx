"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Loader2, Calendar } from "lucide-react";
import Link from "next/link";
import { updateTransaction } from "@/app/actions/transactions";
import { getCategories } from "@/app/actions/categories";
import { getAccounts } from "@/app/actions/accounts";
import { CategoryGrid } from "@/components/category-grid";
import { formatCurrency } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

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

  // Form state
  const [type, setType] = useState<"income" | "expense">("expense");
  const [amount, setAmount] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");

  // Data
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        const [cats, accs] = await Promise.all([
          getCategories(),
          getAccounts(),
        ]);
        setCategories(cats as Category[]);
        setAccounts(accs as Account[]);

        // Fetch current transaction
        const supabase = createClient();
        const { data: transaction } = await supabase
          .from("transactions")
          .select("*")
          .eq("id", transactionId)
          .is("deleted_at", null)
          .single();

        if (transaction) {
          setType(transaction.type);
          setAmount(String(transaction.amount));
          setSelectedCategory(transaction.category_id);
          setSelectedAccount(transaction.account_id);
          setDate(transaction.transaction_date);
          setNote(transaction.note || "");
        }
      } catch {
        setError("Failed to load transaction");
      } finally {
        setDataLoading(false);
      }
    }
    loadData();
  }, [transactionId]);

  const filteredCategories = categories.filter((c) => c.type === type);

  const isValid =
    Number(amount) > 0 && selectedCategory && selectedAccount && date;

  const handleSubmit = async () => {
    if (!isValid) return;
    setLoading(true);
    setError("");

    try {
      await updateTransaction(transactionId, {
        type,
        amount: Number(amount),
        category_id: selectedCategory!,
        account_id: selectedAccount,
        transaction_date: date,
        note: note || undefined,
      });
      router.push("/transactions");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update transaction",
      );
    } finally {
      setLoading(false);
    }
  };

  if (dataLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="px-4 pt-4 pb-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/transactions"
          className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-xl font-bold">Edit Transaction</h1>
      </div>

      {/* Type toggle */}
      <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
        <button
          onClick={() => {
            setType("expense");
            setSelectedCategory(null);
          }}
          className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            type === "expense"
              ? "bg-white text-red-500 shadow-sm"
              : "text-gray-500"
          }`}
        >
          Expense
        </button>
        <button
          onClick={() => {
            setType("income");
            setSelectedCategory(null);
          }}
          className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            type === "income"
              ? "bg-white text-emerald-600 shadow-sm"
              : "text-gray-500"
          }`}
        >
          Income
        </button>
      </div>

      {/* Amount input */}
      <div className="mb-6">
        <label className="text-sm font-medium text-gray-500 mb-2 block">
          Amount
        </label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-gray-400">
            $
          </span>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full pl-10 pr-4 py-4 text-3xl font-bold bg-gray-50 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            inputMode="decimal"
            min="0"
            step="0.01"
          />
        </div>
      </div>

      {/* Category selector */}
      <div className="mb-6">
        <label className="text-sm font-medium text-gray-500 mb-3 block">
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
          className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none cursor-pointer"
        >
          {accounts.map((acc) => (
            <option key={acc.id} value={acc.id}>
              {acc.name} ({formatCurrency(Number(acc.balance))})
            </option>
          ))}
        </select>
      </div>

      {/* Date picker */}
      <div className="mb-6">
        <label className="text-sm font-medium text-gray-500 mb-2 block">
          Date
        </label>
        <div className="relative">
          <Calendar
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            size={18}
          />
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-gray-50 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Note */}
      <div className="mb-8">
        <label className="text-sm font-medium text-gray-500 mb-2 block">
          Note <span className="text-gray-300">(optional)</span>
        </label>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add a note..."
          maxLength={200}
          className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        {note.length > 0 && (
          <p className="text-xs text-gray-400 mt-1 text-right">
            {note.length}/200
          </p>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* Save button */}
      <button
        onClick={handleSubmit}
        disabled={!isValid || loading}
        className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-semibold text-base disabled:opacity-50 disabled:cursor-not-allowed hover:bg-emerald-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
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
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
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
} from "lucide-react";
import {
  createAccount,
  updateAccount,
  deleteAccount,
} from "@/app/actions/accounts";
import { AccountCard } from "@/components/account-card";
import {
  CategoryManagerSheet,
  type CategoryItem,
} from "@/components/category-manager-sheet";
import { BalanceAdjustmentModal } from "@/components/balance-adjustment-modal";
import { formatCurrency, cn } from "@/lib/utils";

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
          <h3 className="font-semibold text-gray-900">Your Wallets</h3>
          <button
            onClick={openAdd}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 text-white rounded-xl text-xs font-semibold hover:bg-emerald-500 active:scale-95 transition-all"
          >
            <Plus size={14} />
            Add Wallet
          </button>
        </div>

        {accounts.length === 0 ? (
          <div className="text-center py-10 bg-gray-50 rounded-2xl border border-gray-100">
            <p className="text-gray-500 text-sm">
              No accounts yet. Add your first account.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {accounts.map((account) => (
              <AccountCard
                key={account.id}
                id={account.id}
                name={account.name}
                type={account.type}
                balance={account.balance}
                onClick={() => openEdit(account)}
                onAdjust={() => setAdjustingAccount(account)}
              />
            ))}
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

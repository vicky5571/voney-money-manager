"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { createHash } from "node:crypto";
import {
  calculateFinancialHealth,
  type FinancialHealthResult,
} from "@/lib/financial-health";
import { createTransactionSchema } from "@/lib/validations/transaction";

export type { FinancialHealthResult };

/** Generate deterministic RFC-compliant UUID from string seed (e.g. for offline transfer idempotency) */
function toDeterministicUuid(input: string): string {
  const hash = createHash("sha256").update(input).digest("hex");
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    "4" + hash.slice(13, 16),
    ((parseInt(hash.slice(16, 18), 16) & 0x3f) | 0x80).toString(16) + hash.slice(18, 20),
    hash.slice(20, 32),
  ].join("-");
}

/** Sanitize user search for PostgREST ilike: escape % _ \ and limit length to prevent DoS */
function sanitizeSearch(raw?: string): string | null {
  if (!raw) return null;
  const trimmed = raw.trim().slice(0, 50);
  if (!trimmed) return null;
  return trimmed.replace(/[%_\\]/g, "\\$&");
}

/** Verify account belongs to user (IDOR prevention) */
async function assertAccountOwnership(
  supabase: Awaited<ReturnType<typeof createClient>>,
  accountId: string,
  userId: string,
) {
  const { data, error } = await supabase
    .from("accounts")
    .select("id")
    .eq("id", accountId)
    .eq("user_id", userId)
    .single();
  if (error || !data) throw new Error("Account not found or access denied");
}

/** Verify category is default or owned by user */
async function assertCategoryOwnership(
  supabase: Awaited<ReturnType<typeof createClient>>,
  categoryId: string,
  userId: string,
) {
  const { data, error } = await supabase
    .from("categories")
    .select("id, user_id, is_default")
    .eq("id", categoryId)
    .single();
  if (error || !data) throw new Error("Category not found");
  const row = data as unknown as {
    user_id: string | null;
    is_default: boolean;
  };
  if (row.user_id !== null && row.user_id !== userId && !row.is_default) {
    throw new Error("Category not found or access denied");
  }
}

/**
 * Atomically adjusts an account's balance by `delta` (can be positive or negative)
 * using the PostgreSQL RPC `increment_account_balance`.
 * Falls back to safe read-modify-write if the RPC is not present in the current database.
 */
export async function adjustAccountBalanceAtomic(
  supabase: Awaited<ReturnType<typeof createClient>>,
  accountId: string,
  delta: number,
  userId: string,
): Promise<number> {
  try {
    const { data: rpcResult, error: rpcError } = await supabase.rpc(
      "increment_account_balance",
      {
        p_account_id: accountId,
        p_amount: delta,
        p_user_id: userId,
      },
    );

    if (!rpcError && rpcResult !== null && rpcResult !== undefined) {
      return Number(rpcResult);
    }
  } catch {
    // If RPC invocation throws, fall through to fallback
  }

  // Fallback: read-modify-write with user_id ownership check
  const { data: account, error: fetchErr } = await supabase
    .from("accounts")
    .select("balance")
    .eq("id", accountId)
    .eq("user_id", userId)
    .single();

  if (fetchErr || !account) {
    throw new Error("Account not found or access denied");
  }

  const newBalance = Number(account.balance) + delta;
  const { error: updateErr } = await supabase
    .from("accounts")
    .update({ balance: newBalance })
    .eq("id", accountId)
    .eq("user_id", userId);

  if (updateErr) throw updateErr;
  return newBalance;
}

export async function getTransactions({
  page = 1,
  limit = 20,
  type,
  search,
  month,
  year,
}: {
  page?: number;
  limit?: number;
  type?: "income" | "expense";
  search?: string;
  month?: number;
  year?: number;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  let query = supabase
    .from("transactions")
    .select(
      `
      id, type, amount, note, transaction_date, is_settled, created_at,
      categories ( id, name, icon, color, scope ),
      accounts ( id, name )
    `,
      { count: "exact" },
    )
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .order("transaction_date", { ascending: false })
    .order("created_at", { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  if (type) query = query.eq("type", type);
  const safeSearch = sanitizeSearch(search);
  if (safeSearch) query = query.ilike("note", `%${safeSearch}%`);
  if (month && year) {
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    query = query
      .gte("transaction_date", startDate)
      .lte("transaction_date", endDate);
  }

  let { data, count, error } = await query;
  if (error && (error.message?.includes("is_settled") || error.message?.includes("scope") || error.code === "PGRST204" || error.code === "42703")) {
    let fallbackQuery = supabase
      .from("transactions")
      .select(
        `
        id, type, amount, note, transaction_date, created_at,
        categories ( id, name, icon, color ),
        accounts ( id, name )
      `,
        { count: "exact" },
      )
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .order("transaction_date", { ascending: false })
      .order("created_at", { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (type) fallbackQuery = fallbackQuery.eq("type", type);
    if (safeSearch) fallbackQuery = fallbackQuery.ilike("note", `%${safeSearch}%`);
    if (month && year) {
      const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
      fallbackQuery = fallbackQuery
        .gte("transaction_date", startDate)
        .lte("transaction_date", endDate);
    }
    const fallbackResult = await fallbackQuery;
    if (!fallbackResult.error) {
      data = (fallbackResult.data ?? []).map((row) => {
        const cat = row.categories as Record<string, unknown> | Record<string, unknown>[] | null;
        return {
          ...row,
          is_settled: true,
          categories: Array.isArray(cat)
            ? cat.map((c) => ({ ...c, scope: "personal" }))
            : cat && typeof cat === "object"
            ? { ...cat, scope: "personal" }
            : null,
        };
      }) as typeof data;
      count = fallbackResult.count;
      error = null;
    }
  }
  if (error) throw error;

  return {
    transactions: data ?? [],
    total: count ?? 0,
    hasMore: (count ?? 0) > page * limit,
  };
}

export async function getMonthSummary(month: number, year: number) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  const isTransfer = (t: { note?: string | null; categories?: unknown }) => {
    const cat = Array.isArray(t.categories) ? t.categories[0] : t.categories;
    const catName = (cat as { name?: string } | null)?.name?.toLowerCase();
    return (
      catName === "transfer" ||
      (typeof t.note === "string" &&
        (t.note.startsWith("Transfer to") ||
          t.note.startsWith("Transfer from")))
    );
  };

  const getCatScope = (t: { categories?: unknown }): string => {
    const cat = Array.isArray(t.categories) ? t.categories[0] : t.categories;
    return (cat as { scope?: string } | null)?.scope || "personal";
  };

  const { data, error } = await supabase
    .from("transactions")
    .select("type, amount, note, categories ( * )")
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .gte("transaction_date", startDate)
    .lte("transaction_date", endDate);

  if (error) throw error;

  const personalData = (data ?? []).filter(
    (t) => !isTransfer(t) && getCatScope(t) !== "business",
  );
  const businessData = (data ?? []).filter(
    (t) => !isTransfer(t) && getCatScope(t) === "business",
  );

  const personalIncome = personalData
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + Number(t.amount), 0);
  const expense = personalData
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + Number(t.amount), 0);

  const businessRev = businessData
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + Number(t.amount), 0);
  const businessExp = businessData
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + Number(t.amount), 0);
  const businessNetProfit = businessRev - businessExp;

  const income = personalIncome + (businessNetProfit > 0 ? businessNetProfit : 0);

  return { income, expense, net: income - expense };
}

export async function getMonthFinancialHealth(month: number, year: number) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  const isTransfer = (t: { note?: string | null; categories?: unknown }) => {
    const cat = Array.isArray(t.categories) ? t.categories[0] : t.categories;
    const catName = (cat as { name?: string } | null)?.name?.toLowerCase();
    return (
      catName === "transfer" ||
      (typeof t.note === "string" &&
        (t.note.startsWith("Transfer to") ||
          t.note.startsWith("Transfer from")))
    );
  };

  const getCatScope = (t: { categories?: unknown }): string => {
    const cat = Array.isArray(t.categories) ? t.categories[0] : t.categories;
    return (cat as { scope?: string } | null)?.scope || "personal";
  };

  // 1. Get transactions
  const { data: txs } = await supabase
    .from("transactions")
    .select("type, amount, note, categories ( * )")
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .gte("transaction_date", startDate)
    .lte("transaction_date", endDate);

  const personalTxs = (txs ?? []).filter(
    (t) => !isTransfer(t) && getCatScope(t) !== "business",
  );
  const businessTxs = (txs ?? []).filter(
    (t) => !isTransfer(t) && getCatScope(t) === "business",
  );

  const personalIncome = personalTxs
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + Number(t.amount), 0);
  const expense = personalTxs
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + Number(t.amount), 0);

  const businessRev = businessTxs
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + Number(t.amount), 0);
  const businessExp = businessTxs
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + Number(t.amount), 0);
  const businessNetProfit = businessRev - businessExp;

  const income = personalIncome + (businessNetProfit > 0 ? businessNetProfit : 0);

  // 2. Total account balance
  const { data: accounts } = await supabase
    .from("accounts")
    .select("balance")
    .eq("user_id", user.id);
  const totalBalance =
    accounts?.reduce((sum, acc) => sum + Number(acc.balance), 0) ?? 0;

  // 3. Budgets for this month
  const { data: budgets } = await supabase
    .from("budgets")
    .select("amount")
    .eq("user_id", user.id)
    .lte("start_date", endDate)
    .gte("end_date", startDate);
  const totalBudget =
    budgets?.reduce((sum, b) => sum + Number(b.amount), 0) ?? 0;

  // 4. Overdue recurring bills
  const { data: recurringBills } = await supabase
    .from("recurring_bills")
    .select("next_due_date")
    .eq("user_id", user.id)
    .eq("is_active", true);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const hasOverdueBills = (recurringBills ?? []).some(
    (b) => new Date(b.next_due_date + "T00:00:00") < today,
  );

  return calculateFinancialHealth({
    income,
    expense,
    totalBalance,
    totalBudget,
    totalBudgetSpent: expense,
    hasOverdueBills,
    month,
    year,
  });
}

export async function getTransactionCounts(
  search?: string,
  month?: number,
  year?: number,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const buildQuery = (type: "income" | "expense") => {
    let q = supabase
      .from("transactions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .eq("type", type);
    const safeSearch = sanitizeSearch(search);
    if (safeSearch) q = q.ilike("note", `%${safeSearch}%`);
    if (month && year) {
      const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
      q = q.gte("transaction_date", startDate).lte("transaction_date", endDate);
    }
    return q;
  };

  const [{ count: incomeCount }, { count: expenseCount }] = await Promise.all([
    buildQuery("income"),
    buildQuery("expense"),
  ]);

  return {
    all: (incomeCount ?? 0) + (expenseCount ?? 0),
    income: incomeCount ?? 0,
    expense: expenseCount ?? 0,
  };
}

export async function getMonthOverview({
  month,
  year,
  search,
}: {
  month: number;
  year: number;
  search?: string;
}) {
  const [summary, health, counts] = await Promise.all([
    getMonthSummary(month, year),
    getMonthFinancialHealth(month, year),
    getTransactionCounts(search, month, year),
  ]);

  return { summary, health, counts };
}

export async function getTransactionsForExport({
  month,
  year,
  type,
  search,
}: {
  month?: number;
  year?: number;
  type?: "income" | "expense";
  search?: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  let query = supabase
    .from("transactions")
    .select(
      `
      id, type, amount, note, transaction_date,
      categories ( name ),
      accounts ( name )
    `,
    )
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .order("transaction_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (type) query = query.eq("type", type);
  const safeSearch2 = sanitizeSearch(search);
  if (safeSearch2) query = query.ilike("note", `%${safeSearch2}%`);
  if (month && year) {
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    query = query
      .gte("transaction_date", startDate)
      .lte("transaction_date", endDate);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function createTransaction(formData: {
  id?: string;
  type: "income" | "expense";
  amount: number;
  category_id: string;
  account_id: string;
  transaction_date: string;
  note?: string;
  is_settled?: boolean;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Zod validation (strict - prevents negative/Huge/overflow)
  const parsed = createTransactionSchema.safeParse(formData);
  if (!parsed.success)
    throw new Error(parsed.error.issues[0]?.message || "Invalid input");
  const valid = parsed.data;

  // IDOR: verify FK ownership
  await assertAccountOwnership(supabase, valid.account_id, user.id);
  await assertCategoryOwnership(supabase, valid.category_id, user.id);

  // Idempotency check: if an ID was supplied, check if already created (e.g. network dropped before client received 200 OK)
  if (valid.id) {
    const { data: existing } = await supabase
      .from("transactions")
      .select("id")
      .eq("id", valid.id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing) {
      // Transaction was already committed in a prior request; return success immediately to prevent double deduction
      return { success: true, id: existing.id };
    }
  }

  const isSettled = valid.is_settled ?? true;

  const insertPayload: Record<string, unknown> = {
    user_id: user.id,
    type: valid.type,
    amount: valid.amount,
    category_id: valid.category_id,
    account_id: valid.account_id,
    transaction_date: valid.transaction_date,
    note: valid.note || null,
    is_settled: isSettled,
  };

  if (valid.id) {
    insertPayload.id = valid.id;
  }

  const { data: inserted, error } = await supabase
    .from("transactions")
    .insert(insertPayload)
    .select("id")
    .single();

  if (error) {
    // Catch unique constraint violation (code 23505) if a concurrent retry inserted with the same id
    if (valid.id && (error.code === "23505" || error.message?.includes("duplicate key"))) {
      return { success: true, id: valid.id };
    }
    throw error;
  }

  // Update account balance atomically only if settled
  if (isSettled) {
    const delta = valid.type === "income" ? valid.amount : -valid.amount;
    await adjustAccountBalanceAtomic(supabase, valid.account_id, delta, user.id);
  }

  revalidatePath("/");
  revalidatePath("/transactions");
  revalidatePath("/accounts");

  return { success: true, id: (inserted?.id || valid.id) as string };
}

export async function settleTransaction(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: transaction, error: fetchErr } = await supabase
    .from("transactions")
    .select("id, type, amount, account_id, is_settled")
    .eq("id", id)
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .single();

  if (fetchErr || !transaction) throw new Error("Transaction not found");
  if (transaction.is_settled) return { success: true };

  const { error: updateErr } = await supabase
    .from("transactions")
    .update({
      is_settled: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (updateErr) throw updateErr;

  const delta =
    transaction.type === "income"
      ? Number(transaction.amount)
      : -Number(transaction.amount);
  await adjustAccountBalanceAtomic(supabase, transaction.account_id, delta, user.id);

  revalidatePath("/");
  revalidatePath("/transactions");
  revalidatePath("/accounts");

  return { success: true };
}

export async function updateTransaction(
  id: string,
  formData: {
    type: "income" | "expense";
    amount: number;
    category_id: string;
    account_id: string;
    transaction_date: string;
    note?: string;
    is_settled?: boolean;
  },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const parsed = createTransactionSchema.safeParse(formData);
  if (!parsed.success)
    throw new Error(parsed.error.issues[0]?.message || "Invalid input");
  const valid = parsed.data;

  // IDOR check new FKs
  await assertAccountOwnership(supabase, valid.account_id, user.id);
  await assertCategoryOwnership(supabase, valid.category_id, user.id);

  // Get old transaction to reverse its effect on balance
  const { data: oldTransaction } = await supabase
    .from("transactions")
    .select("type, amount, account_id, is_settled")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!oldTransaction) throw new Error("Transaction not found");

  const oldIsSettled = oldTransaction.is_settled ?? true;
  const newIsSettled = valid.is_settled ?? oldIsSettled;

  // Reverse old transaction effect atomically if it was settled
  if (oldIsSettled) {
    const reverseDelta =
      oldTransaction.type === "income"
        ? -Number(oldTransaction.amount)
        : Number(oldTransaction.amount);
    await adjustAccountBalanceAtomic(
      supabase,
      oldTransaction.account_id,
      reverseDelta,
      user.id,
    );
  }

  // Update transaction
  const { error } = await supabase
    .from("transactions")
    .update({
      type: valid.type,
      amount: valid.amount,
      category_id: valid.category_id,
      account_id: valid.account_id,
      transaction_date: valid.transaction_date,
      note: valid.note || null,
      is_settled: newIsSettled,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw error;

  // Apply new transaction effect atomically if settled
  if (newIsSettled) {
    const newDelta = valid.type === "income" ? valid.amount : -valid.amount;
    await adjustAccountBalanceAtomic(
      supabase,
      valid.account_id,
      newDelta,
      user.id,
    );
  }

  revalidatePath("/");
  revalidatePath("/transactions");
  revalidatePath("/accounts");
}

export async function getTransactionById(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("transactions")
    .select("id, type, amount, note, transaction_date, is_settled, category_id, account_id")
    .eq("id", id)
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .single();

  if (error) throw error;
  return data;
}

export async function deleteTransaction(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Get transaction to reverse balance
  const { data: transaction } = await supabase
    .from("transactions")
    .select("type, amount, account_id, is_settled")
    .eq("id", id)
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!transaction) {
    // Already deleted or not found — revalidate paths and return gracefully
    revalidatePath("/");
    revalidatePath("/transactions");
    revalidatePath("/accounts");
    return;
  }

  // Soft delete (audit + restore)
  const { error } = await supabase
    .from("transactions")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw error;

  // Reverse balance atomically only if it was settled
  if (transaction.is_settled !== false) {
    const reverseDelta =
      transaction.type === "income"
        ? -Number(transaction.amount)
        : Number(transaction.amount);
    await adjustAccountBalanceAtomic(
      supabase,
      transaction.account_id,
      reverseDelta,
      user.id,
    );
  }

  revalidatePath("/");
  revalidatePath("/transactions");
  revalidatePath("/accounts");
}

export async function createTransfer(formData: {
  id?: string;
  from_account_id: string;
  to_account_id: string;
  amount: number;
  transaction_date: string;
  note?: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  if (formData.from_account_id === formData.to_account_id) {
    throw new Error("Source and destination accounts must be different");
  }

  if (formData.amount <= 0) {
    throw new Error("Transfer amount must be greater than 0");
  }

  // Idempotency check: if an ID was supplied, derive deterministic UUIDs and check if already processed
  const outId = formData.id ? toDeterministicUuid(`${formData.id}_out`) : undefined;
  const inId = formData.id ? toDeterministicUuid(`${formData.id}_in`) : undefined;

  if (outId) {
    const { data: existing } = await supabase
      .from("transactions")
      .select("id")
      .eq("id", outId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing) {
      // Transfer was already committed in a previous attempt (e.g. network drop before 200 response)
      return { success: true, id: formData.id };
    }
  }

  // Get source and destination accounts
  const [{ data: fromAccount }, { data: toAccount }] = await Promise.all([
    supabase
      .from("accounts")
      .select("id, name, balance")
      .eq("id", formData.from_account_id)
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("accounts")
      .select("id, name, balance")
      .eq("id", formData.to_account_id)
      .eq("user_id", user.id)
      .single(),
  ]);

  if (!fromAccount || !toAccount) throw new Error("Account not found");

  // Find or create dedicated 'Transfer' category (prevents polluting Food/Transport budgets)
  let transferCategoryId: string | null = null;
  const { data: transferCat } = await supabase
    .from("categories")
    .select("id")
    .ilike("name", "Transfer")
    .limit(1);

  if (transferCat && transferCat.length > 0) {
    transferCategoryId = transferCat[0].id;
  } else {
    // Create dedicated 'Transfer' category
    const { data: createdCat } = await supabase
      .from("categories")
      .insert({
        user_id: user.id,
        name: "Transfer",
        icon: "ArrowRightLeft",
        color: "#14B8A6",
        type: "expense",
        is_default: false,
        sort_order: 99,
      })
      .select("id")
      .single();
    transferCategoryId = createdCat?.id ?? null;
  }

  if (!transferCategoryId) {
    const { data: otherCat } = await supabase
      .from("categories")
      .select("id")
      .ilike("name", "Other")
      .limit(1);
    transferCategoryId = otherCat?.[0]?.id ?? null;
  }

  // Deduct from source account atomically
  await adjustAccountBalanceAtomic(supabase, fromAccount.id, -formData.amount, user.id);

  // Add to destination account atomically
  await adjustAccountBalanceAtomic(supabase, toAccount.id, formData.amount, user.id);

  if (transferCategoryId) {
    // Log outbound transfer record under Transfer category
    const outPayload: Record<string, unknown> = {
      user_id: user.id,
      account_id: fromAccount.id,
      category_id: transferCategoryId,
      type: "expense",
      amount: formData.amount,
      transaction_date: formData.transaction_date,
      note: formData.note
        ? `Transfer to ${toAccount.name}: ${formData.note}`
        : `Transfer to ${toAccount.name}`,
    };
    if (outId) outPayload.id = outId;

    const { error: outError } = await supabase.from("transactions").insert(outPayload);
    if (outError && outId && (outError.code === "23505" || outError.message?.includes("duplicate key"))) {
      return { success: true, id: formData.id };
    }
    if (outError) throw outError;

    // Log inbound transfer record under Transfer category
    const inPayload: Record<string, unknown> = {
      user_id: user.id,
      account_id: toAccount.id,
      category_id: transferCategoryId,
      type: "income",
      amount: formData.amount,
      transaction_date: formData.transaction_date,
      note: formData.note
        ? `Transfer from ${fromAccount.name}: ${formData.note}`
        : `Transfer from ${fromAccount.name}`,
    };
    if (inId) inPayload.id = inId;

    const { error: inError } = await supabase.from("transactions").insert(inPayload);
    if (inError && inId && (inError.code === "23505" || inError.message?.includes("duplicate key"))) {
      return { success: true, id: formData.id };
    }
    if (inError) throw inError;
  }

  revalidatePath("/");
  revalidatePath("/transactions");
  revalidatePath("/accounts");
  revalidatePath("/budgets");

  return { success: true, id: formData.id };
}

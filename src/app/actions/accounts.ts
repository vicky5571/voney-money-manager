"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  createAccountSchema,
  updateAccountSchema,
} from "@/lib/validations/account";

export async function getAccounts() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("accounts")
    .select("*")
    .eq("user_id", user.id)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function createAccount(formData: {
  name: string;
  type: "cash" | "bank" | "e-wallet";
  icon?: string;
  balance?: number;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const parsed = createAccountSchema.safeParse({
    name: formData.name,
    type: formData.type,
    icon: formData.icon,
  });
  if (!parsed.success)
    throw new Error(parsed.error.issues[0]?.message || "Invalid account input");
  if (
    formData.balance !== undefined &&
    (!Number.isFinite(formData.balance) ||
      formData.balance < 0 ||
      formData.balance > 1e12)
  ) {
    throw new Error("Invalid balance");
  }

  const { error } = await supabase.from("accounts").insert({
    user_id: user.id,
    name: parsed.data.name,
    type: parsed.data.type,
    icon: parsed.data.icon || "wallet",
    balance: formData.balance ?? 0,
  });

  if (error) throw error;
  revalidatePath("/accounts");
  revalidatePath("/");
}

export async function updateAccount(
  id: string,
  formData: {
    name: string;
    type: "cash" | "bank" | "e-wallet";
  },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const parsed = updateAccountSchema.safeParse(formData);
  if (!parsed.success)
    throw new Error(parsed.error.issues[0]?.message || "Invalid account input");

  const { error } = await supabase
    .from("accounts")
    .update({ name: parsed.data.name, type: parsed.data.type })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw error;
  revalidatePath("/accounts");
  revalidatePath("/");
}

export async function deleteAccount(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Check if this is the last account
  const { data: accounts } = await supabase
    .from("accounts")
    .select("id")
    .eq("user_id", user.id);

  if (accounts && accounts.length <= 1) {
    throw new Error("You must have at least one account");
  }

  // Delete all transactions in this account first
  await supabase
    .from("transactions")
    .delete()
    .eq("account_id", id)
    .eq("user_id", user.id);

  const { error } = await supabase
    .from("accounts")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw error;
  revalidatePath("/accounts");
  revalidatePath("/");
  revalidatePath("/transactions");
}

export async function reorderAccounts(orderedIds: string[]) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const updates = orderedIds.map((id, index) =>
    supabase
      .from("accounts")
      .update({ sort_order: index })
      .eq("id", id)
      .eq("user_id", user.id),
  );

  await Promise.all(updates);

  revalidatePath("/accounts");
  revalidatePath("/");
}

export async function adjustAccountBalance(
  accountId: string,
  newBalance: number,
  note?: string,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  if (!Number.isFinite(newBalance) || newBalance < 0 || newBalance > 1e12) {
    throw new Error("Please enter a valid balance");
  }

  // 1. Get account
  const { data: account, error: accFetchError } = await supabase
    .from("accounts")
    .select("id, name, balance")
    .eq("id", accountId)
    .eq("user_id", user.id)
    .single();

  if (accFetchError || !account) {
    throw new Error("Account not found");
  }

  const currentBalance = Number(account.balance);
  const diff = Number((newBalance - currentBalance).toFixed(2));

  // No change needed
  if (Math.abs(diff) < 0.005) {
    return { adjusted: false, difference: 0, newBalance };
  }

  const type: "income" | "expense" = diff > 0 ? "income" : "expense";
  const amount = Math.abs(diff);

  // 2. Find or create Adjustment category
  let categoryId: string | null = null;
  const { data: existingCat } = await supabase
    .from("categories")
    .select("id")
    .or(`user_id.eq.${user.id},is_default.eq.true`)
    .eq("type", type)
    .ilike("name", "%Adjustment%")
    .limit(1)
    .maybeSingle();

  if (existingCat) {
    categoryId = existingCat.id;
  } else {
    // Attempt to create a user category for Adjustment
    const { data: newCat, error: catError } = await supabase
      .from("categories")
      .insert({
        user_id: user.id,
        name: "Balance Adjustment",
        icon: "SlidersHorizontal",
        color: "#64748B",
        type,
        is_default: false,
        sort_order: 99,
      })
      .select("id")
      .maybeSingle();

    if (!catError && newCat) {
      categoryId = newCat.id;
    } else {
      // Fallback to "Other" or "Other Income"
      const fallbackName = type === "expense" ? "Other" : "Other Income";
      const { data: fallbackCat } = await supabase
        .from("categories")
        .select("id")
        .or(`user_id.eq.${user.id},is_default.eq.true`)
        .eq("type", type)
        .ilike("name", fallbackName)
        .limit(1)
        .single();
      categoryId = fallbackCat?.id ?? null;
    }
  }

  if (!categoryId) {
    throw new Error("Failed to resolve category for adjustment");
  }

  const today = new Date().toISOString().split("T")[0];
  const adjustmentNote =
    note?.trim() ||
    `Balance adjustment (${diff > 0 ? "+" : "-"}${Math.abs(diff).toFixed(2)})`;

  // 3. Create the adjustment transaction
  const { error: txError } = await supabase.from("transactions").insert({
    user_id: user.id,
    account_id: account.id,
    category_id: categoryId,
    type,
    amount,
    note: adjustmentNote,
    transaction_date: today,
  });

  if (txError) throw txError;

  // 4. Update the account balance
  const { error: accUpdateError } = await supabase
    .from("accounts")
    .update({ balance: newBalance })
    .eq("id", account.id)
    .eq("user_id", user.id);

  if (accUpdateError) throw accUpdateError;

  revalidatePath("/accounts");
  revalidatePath("/transactions");
  revalidatePath("/");

  return { adjusted: true, difference: diff, newBalance };
}

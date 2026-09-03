"use server";

import { createClient } from "@/lib/supabase/server";
import {
  calculateFinancialHealth,
  type FinancialHealthResult,
} from "@/lib/financial-health";

export type { FinancialHealthResult };

export interface CategoryBudgetStatus {
  id: string;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  budgetAmount: number;
  spentAmount: number;
  percentage: number;
  isOver: boolean;
  isNear: boolean;
}

export interface BusinessSummary {
  revenue: number;
  expenses: number;
  netProfit: number;
  profitMargin: number;
  transactionCount: number;
  hasBusinessActivity: boolean;
}

export interface SpendingInsight {
  type: "warning" | "info" | "positive";
  headline: string;
  subtext: string;
  spendingRate: number | null;
  topCategory: {
    name: string;
    amount: number;
    percentage: number;
    icon: string;
    color: string;
  } | null;
}

export async function getDashboardData() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const userId = user.id;

  // Date ranges computed once for parallel queries
  const now = new Date();
  const firstOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const lastOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()}`;
  const trendStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - 29,
  );
  const trendStartDate = `${trendStart.getFullYear()}-${String(trendStart.getMonth() + 1).padStart(2, "0")}-${String(trendStart.getDate()).padStart(2, "0")}`;
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const firstOfPrevMonth = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, "0")}-01`;
  const lastOfPrevMonth = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, "0")}-${new Date(prevMonthDate.getFullYear(), prevMonthDate.getMonth() + 1, 0).getDate()}`;

  // Parallelize all independent Supabase reads (was 7 sequential awaits -> now 1 batch)
  const [
    { data: accounts },
    { data: monthlyTransactions },
    { data: trendTransactions },
    { data: budgets },
    { data: prevMonthTransactions },
    { data: upcomingBillsRaw },
    { data: recentTransactions },
  ] = await Promise.all([
    supabase
      .from("accounts")
      .select("id, name, type, icon, balance")
      .eq("user_id", userId)
      .order("created_at", { ascending: true }),
    supabase
      .from("transactions")
      .select(
        `id, type, amount, note, category_id, transaction_date, categories ( * )`,
      )
      .eq("user_id", userId)
      .is("deleted_at", null)
      .gte("transaction_date", firstOfMonth)
      .lte("transaction_date", lastOfMonth),
    supabase
      .from("transactions")
      .select(`amount, transaction_date, note, categories ( * )`)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .eq("type", "expense")
      .gte("transaction_date", trendStartDate)
      .lte("transaction_date", today),
    supabase
      .from("budgets")
      .select(
        `id, amount, category_id, start_date, end_date, categories ( id, name, icon, color )`,
      )
      .eq("user_id", userId)
      .lte("start_date", lastOfMonth)
      .gte("end_date", firstOfMonth),
    supabase
      .from("transactions")
      .select(`amount, note, categories ( * )`)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .eq("type", "expense")
      .gte("transaction_date", firstOfPrevMonth)
      .lte("transaction_date", lastOfPrevMonth),
    supabase
      .from("recurring_bills")
      .select(
        `id, name, amount, frequency, next_due_date, categories:categories!category_id ( id, name, icon, color ), accounts:accounts!account_id ( id, name )`,
      )
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("next_due_date", { ascending: true })
      .limit(3),
    supabase
      .from("transactions")
      .select(
        `id, type, amount, note, transaction_date, categories ( * ), accounts ( id, name )`,
      )
      .eq("user_id", userId)
      .is("deleted_at", null)
      .order("transaction_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const totalBalance =
    accounts?.reduce((sum, acc) => sum + Number(acc.balance), 0) ?? 0;

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

  // Personal 30-day spending trend (excludes business transactions)
  const spendingByDate = (trendTransactions ?? [])
    .filter((t) => !isTransfer(t) && getCatScope(t) !== "business")
    .reduce<Record<string, number>>((totals, transaction) => {
      totals[transaction.transaction_date] =
        (totals[transaction.transaction_date] ?? 0) +
        Number(transaction.amount);
      return totals;
    }, {});

  const spendingTrend = Array.from({ length: 30 }, (_, index) => {
    const date = new Date(trendStart);
    date.setDate(trendStart.getDate() + index);
    const rawDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    return {
      date: rawDate,
      label: date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      amount: spendingByDate[rawDate] ?? 0,
    };
  });

  // Personal Monthly Transactions (scope !== 'business')
  const personalMonthlyTxs = (monthlyTransactions ?? []).filter(
    (t) => !isTransfer(t) && getCatScope(t) !== "business",
  );

  const personalIncome = personalMonthlyTxs
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const expense = personalMonthlyTxs
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  // Business Transactions Summary (scope === 'business')
  const businessMonthlyTxs = (monthlyTransactions ?? []).filter((t) => {
    if (isTransfer(t)) return false;
    return getCatScope(t) === "business";
  });

  const businessRevenue = businessMonthlyTxs
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const businessExpenses = businessMonthlyTxs
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const businessNetProfit = businessRevenue - businessExpenses;
  const businessProfitMargin =
    businessRevenue > 0
      ? Math.round(((businessRevenue - businessExpenses) / businessRevenue) * 100)
      : 0;

  // Flow positive business net profit into total personal income for cash flow, insight, and health
  const effectiveBusinessProfit = businessNetProfit > 0 ? businessNetProfit : 0;
  const income = personalIncome + effectiveBusinessProfit;

  const businessSummary: BusinessSummary = {
    revenue: businessRevenue,
    expenses: businessExpenses,
    netProfit: businessNetProfit,
    profitMargin: businessProfitMargin,
    transactionCount: businessMonthlyTxs.length,
    hasBusinessActivity:
      businessMonthlyTxs.length > 0 ||
      businessRevenue > 0 ||
      businessExpenses > 0,
  };

  let totalBudget = 0;
  let totalBudgetSpent = 0;
  const categoryBudgets: CategoryBudgetStatus[] = [];

  if (budgets && budgets.length > 0) {
    budgets.forEach((b) => {
      const budgetAmount = Number(b.amount);
      totalBudget += budgetAmount;

      const cat = Array.isArray(b.categories) ? b.categories[0] : b.categories;
      const bStart = b.start_date;
      const bEnd = b.end_date;

      const spentForBudget = (monthlyTransactions ?? [])
        .filter(
          (t) =>
            t.type === "expense" &&
            !isTransfer(t) &&
            t.category_id === b.category_id &&
            t.transaction_date >= bStart &&
            t.transaction_date <= bEnd,
        )
        .reduce((sum, t) => sum + Number(t.amount), 0);

      totalBudgetSpent += spentForBudget;

      const percentage =
        budgetAmount > 0
          ? Math.round((spentForBudget / budgetAmount) * 100)
          : 0;
      const isOver = spentForBudget > budgetAmount;
      const isNear = percentage >= 85 && !isOver;

      categoryBudgets.push({
        id: b.id,
        categoryName: cat?.name || "Category",
        categoryIcon: cat?.icon || "Package",
        categoryColor: cat?.color || "#10B981",
        budgetAmount,
        spentAmount: spentForBudget,
        percentage,
        isOver,
        isNear,
      });
    });
  }

  // Calculate actionable spending insights for personal spending (excluding business & transfers)
  const expenseByCategory: Record<
    string,
    { name: string; icon: string; color: string; amount: number }
  > = {};
  personalMonthlyTxs
    .filter((t) => t.type === "expense")
    .forEach((t) => {
      const cat = Array.isArray(t.categories) ? t.categories[0] : t.categories;
      const catId = t.category_id || "other";
      if (!expenseByCategory[catId]) {
        expenseByCategory[catId] = {
          name: (cat as { name?: string } | null)?.name || "Other",
          icon: (cat as { icon?: string } | null)?.icon || "Package",
          color: (cat as { color?: string } | null)?.color || "#10B981",
          amount: 0,
        };
      }
      expenseByCategory[catId].amount += Number(t.amount);
    });

  const sortedCategories = Object.values(expenseByCategory).sort(
    (a, b) => b.amount - a.amount,
  );
  const topCategoryData = sortedCategories[0] || null;
  const topCategory =
    topCategoryData && expense > 0
      ? {
          ...topCategoryData,
          percentage: Math.round((topCategoryData.amount / expense) * 100),
        }
      : null;

  const spendingRate = income > 0 ? Math.round((expense / income) * 100) : null;

  let insight: SpendingInsight | null = null;
  if (spendingRate !== null) {
    if (spendingRate > 100) {
      insight = {
        type: "warning",
        headline: `You spent ${spendingRate}% of monthly income`,
        subtext: topCategory
          ? `Top category: ${topCategory.name} (${topCategory.percentage}% of spending)`
          : "Expenses exceed your income this month",
        spendingRate,
        topCategory,
      };
    } else if (spendingRate >= 80) {
      insight = {
        type: "warning",
        headline: `You spent ${spendingRate}% of monthly income`,
        subtext: topCategory
          ? `Top category: ${topCategory.name} (${topCategory.percentage}% of spending)`
          : "Approaching monthly income limit",
        spendingRate,
        topCategory,
      };
    } else {
      insight = {
        type: "positive",
        headline: `You spent ${spendingRate}% of monthly income`,
        subtext: topCategory
          ? `Top category: ${topCategory.name} (${topCategory.percentage}%)`
          : `Great pace! ${100 - spendingRate}% of income preserved`,
        spendingRate,
        topCategory,
      };
    }
  } else if (topCategory) {
    insight = {
      type: "info",
      headline: `Top expense: ${topCategory.name}`,
      subtext: `${topCategory.percentage}% of total expenses this month`,
      spendingRate: null,
      topCategory,
    };
  }

  const prevMonthExpense = (prevMonthTransactions ?? [])
    .filter((t) => !isTransfer(t) && getCatScope(t) !== "business")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  let momComparison = null;
  if (prevMonthExpense > 0) {
    const diff = Math.round(
      ((expense - prevMonthExpense) / prevMonthExpense) * 100,
    );
    momComparison = {
      lastMonthTotal: prevMonthExpense,
      diffPercentage: diff,
      isLower: diff < 0,
    };
  }

  const categorySpendingBreakdown = sortedCategories.map((cat) => ({
    name: cat.name,
    amount: cat.amount,
    percentage: expense > 0 ? Math.round((cat.amount / expense) * 100) : 0,
    color: cat.color,
    icon: cat.icon,
  }));

  const upcomingBills = (
    (upcomingBillsRaw as unknown as Array<{
      id: string;
      name: string;
      amount: number | string;
      frequency: string;
      next_due_date: string;
      categories:
        | { id?: string; name: string; icon: string; color: string }
        | { id?: string; name: string; icon: string; color: string }[]
        | null;
      accounts:
        | { id?: string; name: string }
        | { id?: string; name: string }[]
        | null;
    }>) ?? []
  ).map((bill) => ({
    id: bill.id,
    name: bill.name,
    amount: Number(bill.amount),
    frequency: bill.frequency,
    next_due_date: bill.next_due_date,
    categories: Array.isArray(bill.categories)
      ? (bill.categories[0] ?? null)
      : bill.categories,
    accounts: Array.isArray(bill.accounts)
      ? (bill.accounts[0] ?? null)
      : bill.accounts,
  }));

  // Check for overdue bills
  const hasOverdueBills = upcomingBills.some((bill) => {
    const due = new Date(bill.next_due_date + "T00:00:00");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return due < today;
  });

  const financialHealth = calculateFinancialHealth({
    income,
    expense,
    totalBalance,
    totalBudget,
    totalBudgetSpent,
    hasOverdueBills,
  });

  return {
    totalBalance,
    income,
    expense,
    accounts: accounts ?? [],
    totalBudget,
    totalBudgetSpent,
    categoryBudgets,
    spendingInsight: insight,
    spendingTrend,
    categorySpendingBreakdown,
    momComparison,
    upcomingBills,
    financialHealth,
    businessSummary,
    recentTransactions: recentTransactions ?? [],
  };
}

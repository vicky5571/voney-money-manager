'use server';

import { createClient } from '@/lib/supabase/server';
import { calculateFinancialHealth, type FinancialHealthResult } from '@/lib/financial-health';

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

export interface SpendingInsight {
  type: 'warning' | 'info' | 'positive';
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
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) throw new Error('Not authenticated');

  // Get all accounts for total balance and wallet preview
  const { data: accounts } = await supabase
    .from('accounts')
    .select('id, name, type, icon, balance')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true });

  const totalBalance = accounts?.reduce((sum, acc) => sum + Number(acc.balance), 0) ?? 0;

  // Get current month transactions for income/expense summary
  const now = new Date();
  const firstOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const lastOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()}`;

  const { data: monthlyTransactions } = await supabase
    .from('transactions')
    .select(`
      id,
      type,
      amount,
      category_id,
      transaction_date,
      categories ( id, name, icon, color )
    `)
    .eq('user_id', user.id)
    .gte('transaction_date', firstOfMonth)
    .lte('transaction_date', lastOfMonth);

  const trendStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
  const trendStartDate = `${trendStart.getFullYear()}-${String(trendStart.getMonth() + 1).padStart(2, '0')}-${String(trendStart.getDate()).padStart(2, '0')}`;
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  
  const { data: trendTransactions } = await supabase
    .from('transactions')
    .select('amount, transaction_date')
    .eq('user_id', user.id)
    .eq('type', 'expense')
    .gte('transaction_date', trendStartDate)
    .lte('transaction_date', today);

  const spendingByDate = (trendTransactions ?? []).reduce<Record<string, number>>((totals, transaction) => {
    totals[transaction.transaction_date] = (totals[transaction.transaction_date] ?? 0) + Number(transaction.amount);
    return totals;
  }, {});

  const spendingTrend = Array.from({ length: 30 }, (_, index) => {
    const date = new Date(trendStart);
    date.setDate(trendStart.getDate() + index);
    const rawDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return {
      date: rawDate,
      label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      amount: spendingByDate[rawDate] ?? 0,
    };
  });

  const income = (monthlyTransactions ?? [])
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const expense = (monthlyTransactions ?? [])
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  // Get active budgets for this month with category details
  const { data: budgets } = await supabase
    .from('budgets')
    .select(`
      id,
      amount,
      category_id,
      start_date,
      end_date,
      categories ( id, name, icon, color )
    `)
    .eq('user_id', user.id)
    .lte('start_date', lastOfMonth)
    .gte('end_date', firstOfMonth);

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
            t.type === 'expense' &&
            t.category_id === b.category_id &&
            t.transaction_date >= bStart &&
            t.transaction_date <= bEnd
        )
        .reduce((sum, t) => sum + Number(t.amount), 0);

      totalBudgetSpent += spentForBudget;

      const percentage = budgetAmount > 0 ? Math.round((spentForBudget / budgetAmount) * 100) : 0;
      const isOver = spentForBudget > budgetAmount;
      const isNear = percentage >= 85 && !isOver;

      categoryBudgets.push({
        id: b.id,
        categoryName: cat?.name || 'Category',
        categoryIcon: cat?.icon || 'Package',
        categoryColor: cat?.color || '#6366f1',
        budgetAmount,
        spentAmount: spentForBudget,
        percentage,
        isOver,
        isNear,
      });
    });
  }

  // Calculate actionable spending insights
  const expenseByCategory: Record<string, { name: string; icon: string; color: string; amount: number }> = {};
  (monthlyTransactions ?? []).filter(t => t.type === 'expense').forEach((t) => {
    const cat = Array.isArray(t.categories) ? t.categories[0] : t.categories;
    const catId = t.category_id || 'other';
    if (!expenseByCategory[catId]) {
      expenseByCategory[catId] = {
        name: cat?.name || 'Other',
        icon: cat?.icon || 'Package',
        color: cat?.color || '#6366f1',
        amount: 0,
      };
    }
    expenseByCategory[catId].amount += Number(t.amount);
  });

  const sortedCategories = Object.values(expenseByCategory).sort((a, b) => b.amount - a.amount);
  const topCategoryData = sortedCategories[0] || null;
  const topCategory = topCategoryData && expense > 0 ? {
    ...topCategoryData,
    percentage: Math.round((topCategoryData.amount / expense) * 100),
  } : null;

  const spendingRate = income > 0 ? Math.round((expense / income) * 100) : null;

  let insight: SpendingInsight | null = null;
  if (spendingRate !== null) {
    if (spendingRate > 100) {
      insight = {
        type: 'warning',
        headline: `You spent ${spendingRate}% of monthly income`,
        subtext: topCategory ? `Top category: ${topCategory.name} (${topCategory.percentage}% of spending)` : 'Expenses exceed your income this month',
        spendingRate,
        topCategory,
      };
    } else if (spendingRate >= 80) {
      insight = {
        type: 'warning',
        headline: `You spent ${spendingRate}% of monthly income`,
        subtext: topCategory ? `Top category: ${topCategory.name} (${topCategory.percentage}% of spending)` : 'Approaching monthly income limit',
        spendingRate,
        topCategory,
      };
    } else {
      insight = {
        type: 'positive',
        headline: `You spent ${spendingRate}% of monthly income`,
        subtext: topCategory ? `Top category: ${topCategory.name} (${topCategory.percentage}%)` : `Great pace! ${100 - spendingRate}% of income preserved`,
        spendingRate,
        topCategory,
      };
    }
  } else if (topCategory) {
    insight = {
      type: 'info',
      headline: `Top expense: ${topCategory.name}`,
      subtext: `${topCategory.percentage}% of total expenses this month`,
      spendingRate: null,
      topCategory,
    };
  }

  // Month-over-Month Comparison
  const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const firstOfPrevMonth = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}-01`;
  const lastOfPrevMonth = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}-${new Date(prevMonthDate.getFullYear(), prevMonthDate.getMonth() + 1, 0).getDate()}`;

  const { data: prevMonthTransactions } = await supabase
    .from('transactions')
    .select('amount')
    .eq('user_id', user.id)
    .eq('type', 'expense')
    .gte('transaction_date', firstOfPrevMonth)
    .lte('transaction_date', lastOfPrevMonth);

  const prevMonthExpense = (prevMonthTransactions ?? []).reduce((sum, t) => sum + Number(t.amount), 0);

  let momComparison = null;
  if (prevMonthExpense > 0) {
    const diff = Math.round(((expense - prevMonthExpense) / prevMonthExpense) * 100);
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

  // Get active upcoming recurring bills
  const { data: upcomingBillsRaw } = await supabase
    .from('recurring_bills')
    .select(`
      id,
      name,
      amount,
      frequency,
      next_due_date,
      categories:categories!category_id ( id, name, icon, color ),
      accounts:accounts!account_id ( id, name )
    `)
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('next_due_date', { ascending: true })
    .limit(3);

  const upcomingBills = (upcomingBillsRaw ?? []).map((bill) => ({
    id: bill.id,
    name: bill.name,
    amount: Number(bill.amount),
    frequency: bill.frequency,
    next_due_date: bill.next_due_date,
    categories: Array.isArray(bill.categories) ? bill.categories[0] ?? null : bill.categories,
    accounts: Array.isArray(bill.accounts) ? bill.accounts[0] ?? null : bill.accounts,
  }));

  // Get recent 5 transactions with category info
  const { data: recentTransactions } = await supabase
    .from('transactions')
    .select(`
      id,
      type,
      amount,
      note,
      transaction_date,
      categories ( id, name, icon, color ),
      accounts ( id, name )
    `)
    .eq('user_id', user.id)
    .order('transaction_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(5);

  // Check for overdue bills
  const hasOverdueBills = upcomingBills.some((bill) => {
    const due = new Date(bill.next_due_date + 'T00:00:00');
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
    recentTransactions: recentTransactions ?? [],
  };
}

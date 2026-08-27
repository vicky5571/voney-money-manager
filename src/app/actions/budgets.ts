'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { createBudgetSchema } from '@/lib/validations/budget';

export interface BudgetCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export interface BudgetQueryResult {
  id: string;
  amount: number;
  startDate: string;
  endDate: string;
  month?: number | null;
  year?: number | null;
  category: BudgetCategory | null;
  spent: number;
}

export interface BudgetChartDataPoint {
  date: string;
  rawDate: string;
  recommended: number;
  actual: number | null;
  projected: number | null;
}

export interface BudgetTransactionItem {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  note: string | null;
  transaction_date: string;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  accountName?: string;
}

export interface BudgetDetailResult {
  id: string;
  amount: number;
  startDate: string;
  endDate: string;
  month?: number | null;
  year?: number | null;
  category: BudgetCategory | null;
  spent: number;
  remaining: number;
  percentage: number;
  totalDays: number;
  daysElapsed: number;
  daysRemaining: number;
  dailySafeSpend: number;
  chartData: BudgetChartDataPoint[];
  transactions: BudgetTransactionItem[];
}

export async function getBudgets(month?: number, year?: number): Promise<BudgetQueryResult[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const now = new Date();
  const targetMonth = month ?? now.getMonth() + 1;
  const targetYear = year ?? now.getFullYear();

  const firstOfMonth = `${targetYear}-${String(targetMonth).padStart(2, '0')}-01`;
  const lastOfMonth = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${new Date(targetYear, targetMonth, 0).getDate()}`;

  // Fetch budgets that overlap with the selected month or range
  const { data: budgets, error: budgetsError } = await supabase
    .from('budgets')
    .select(`
      id, amount, start_date, end_date, month, year,
      categories ( id, name, icon, color )
    `)
    .eq('user_id', user.id)
    .lte('start_date', lastOfMonth)
    .gte('end_date', firstOfMonth)
    .order('start_date', { ascending: true });

  if (budgetsError) throw budgetsError;
  if (!budgets || budgets.length === 0) return [];

  // Find the earliest start_date and latest end_date among these budgets
  const minStartDate = budgets.reduce((min, b) => (b.start_date < min ? b.start_date : min), budgets[0].start_date);
  const maxEndDate = budgets.reduce((max, b) => (b.end_date > max ? b.end_date : max), budgets[0].end_date);

  // Fetch all expense transactions in the bounding date range
  const { data: transactions, error: txError } = await supabase
    .from('transactions')
    .select('category_id, amount, transaction_date')
    .eq('user_id', user.id)
    .eq('type', 'expense')
    .gte('transaction_date', minStartDate)
    .lte('transaction_date', maxEndDate);

  if (txError) throw txError;

  const txList = transactions ?? [];

  return budgets.map((b) => {
    const category = (Array.isArray(b.categories) ? b.categories[0] : b.categories) as BudgetCategory | null;
    const catId = category?.id ?? '';

    // Sum transactions matching this budget's category and date interval
    const spent = txList
      .filter((t) => t.category_id === catId && t.transaction_date >= b.start_date && t.transaction_date <= b.end_date)
      .reduce((sum, t) => sum + Number(t.amount), 0);

    return {
      id: b.id,
      amount: Number(b.amount),
      startDate: b.start_date,
      endDate: b.end_date,
      month: b.month,
      year: b.year,
      category,
      spent,
    };
  });
}

export async function getBudgetDetail(id: string): Promise<BudgetDetailResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Fetch budget with category
  const { data: budget, error: budgetError } = await supabase
    .from('budgets')
    .select(`
      id, amount, start_date, end_date, month, year,
      categories ( id, name, icon, color )
    `)
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (budgetError || !budget) {
    throw new Error('Budget not found');
  }

  const category = (Array.isArray(budget.categories) ? budget.categories[0] : budget.categories) as BudgetCategory | null;
  const catId = category?.id ?? '';

  // Fetch transactions for this category within the budget date range
  const { data: rawTxns, error: txError } = await supabase
    .from('transactions')
    .select(`
      id, type, amount, note, transaction_date,
      accounts ( name )
    `)
    .eq('user_id', user.id)
    .eq('category_id', catId)
    .eq('type', 'expense')
    .gte('transaction_date', budget.start_date)
    .lte('transaction_date', budget.end_date)
    .order('transaction_date', { ascending: false });

  if (txError) throw txError;

  const transactions: BudgetTransactionItem[] = (rawTxns ?? []).map((t) => {
    const acc = Array.isArray(t.accounts) ? t.accounts[0] : t.accounts;
    return {
      id: t.id,
      type: t.type as 'income' | 'expense',
      amount: Number(t.amount),
      note: t.note,
      transaction_date: t.transaction_date,
      categoryName: category?.name ?? 'Category',
      categoryIcon: category?.icon ?? 'Package',
      categoryColor: category?.color ?? '#6B7280',
      accountName: acc?.name,
    };
  });

  const totalSpent = transactions.reduce((sum, t) => sum + t.amount, 0);
  const budgetAmount = Number(budget.amount);
  const remaining = budgetAmount - totalSpent;
  const percentage = budgetAmount > 0 ? (totalSpent / budgetAmount) * 100 : 100;

  // Build daily timeline from start_date to end_date
  const startDate = new Date(budget.start_date);
  const endDate = new Date(budget.end_date);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const todayStr = new Date().toISOString().split('T')[0];

  const dateList: string[] = [];
  const curr = new Date(startDate);
  while (curr <= endDate) {
    dateList.push(curr.toISOString().split('T')[0]);
    curr.setDate(curr.getDate() + 1);
  }

  const totalDays = Math.max(1, dateList.length);

  // Group transactions by date
  const spentByDate: Record<string, number> = {};
  for (const t of transactions) {
    spentByDate[t.transaction_date] = (spentByDate[t.transaction_date] || 0) + t.amount;
  }

  // Find index of today in dateList
  let todayIndex = dateList.indexOf(todayStr);
  if (todayIndex === -1) {
    if (todayStr < dateList[0]) todayIndex = -1; // Before start
    else todayIndex = dateList.length - 1; // After end
  }

  const daysElapsed = Math.min(totalDays, Math.max(1, todayIndex + 1));
  const daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  const dailySafeSpend = daysRemaining > 0 ? Math.max(0, Math.round(remaining / daysRemaining)) : 0;

  // Compute 3-line chart series
  let runningActual = 0;
  const chartData: BudgetChartDataPoint[] = [];

  // Calculate actual total up to today
  let spentUpToToday = 0;
  for (let i = 0; i <= Math.min(todayIndex, dateList.length - 1); i++) {
    if (i >= 0) {
      spentUpToToday += spentByDate[dateList[i]] || 0;
    }
  }

  const currentDailyRate = daysElapsed > 0 ? spentUpToToday / daysElapsed : 0;

  for (let i = 0; i < dateList.length; i++) {
    const dStr = dateList[i];
    const dayNum = i + 1;
    const dObj = new Date(dStr);
    const label = dObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    // 1. Recommended linear budget pace
    const recommended = Math.round((budgetAmount / totalDays) * dayNum);

    // 2. Actual cumulative spending
    let actual: number | null = null;
    if (i <= todayIndex) {
      runningActual += spentByDate[dStr] || 0;
      actual = runningActual;
    }

    // 3. Projected spending line
    let projected: number | null = null;
    if (todayIndex === -1) {
      // Future budget not started yet
      projected = Math.round((budgetAmount / totalDays) * dayNum);
    } else if (i === todayIndex) {
      // Connects with actual at today
      projected = actual;
    } else if (i > todayIndex) {
      const daysAhead = i - todayIndex;
      projected = Math.round(spentUpToToday + currentDailyRate * daysAhead);
    }

    chartData.push({
      date: label,
      rawDate: dStr,
      recommended,
      actual,
      projected,
    });
  }

  return {
    id: budget.id,
    amount: budgetAmount,
    startDate: budget.start_date,
    endDate: budget.end_date,
    month: budget.month,
    year: budget.year,
    category,
    spent: totalSpent,
    remaining,
    percentage,
    totalDays,
    daysElapsed,
    daysRemaining,
    dailySafeSpend,
    chartData,
    transactions,
  };
}

export async function createBudget(formData: {
  category_id: string;
  amount: number;
  startDate: string;
  endDate: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const parsed = createBudgetSchema.safeParse(formData);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message || 'Invalid budget input');
  const valid = parsed.data;

  // IDOR: verify category belongs to user or is default
  const { data: cat, error: catErr } = await supabase.from('categories').select('id, user_id, is_default').eq('id', valid.category_id).single();
  if (catErr || !cat) throw new Error('Category not found');
  const catRow = cat as unknown as { user_id: string | null; is_default: boolean };
  if (catRow.user_id !== null && catRow.user_id !== user.id && !catRow.is_default) throw new Error('Category access denied');

  const startD = new Date(valid.startDate);
  const month = startD.getMonth() + 1;
  const year = startD.getFullYear();

  const { error } = await supabase.from('budgets').insert({
    user_id: user.id,
    category_id: valid.category_id,
    amount: valid.amount,
    start_date: valid.startDate,
    end_date: valid.endDate,
    month,
    year,
  });

  if (error) throw error;
  revalidatePath('/budgets');
  revalidatePath('/');
}

export async function updateBudget(id: string, formData: {
  category_id: string;
  amount: number;
  startDate: string;
  endDate: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const parsed = createBudgetSchema.safeParse(formData);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message || 'Invalid budget input');
  const valid = parsed.data;

  const { data: cat, error: catErr } = await supabase.from('categories').select('id, user_id, is_default').eq('id', valid.category_id).single();
  if (catErr || !cat) throw new Error('Category not found');
  const catRow = cat as unknown as { user_id: string | null; is_default: boolean };
  if (catRow.user_id !== null && catRow.user_id !== user.id && !catRow.is_default) throw new Error('Category access denied');

  const startD = new Date(valid.startDate);
  const month = startD.getMonth() + 1;
  const year = startD.getFullYear();

  const { error } = await supabase
    .from('budgets')
    .update({
      category_id: valid.category_id,
      amount: valid.amount,
      start_date: valid.startDate,
      end_date: valid.endDate,
      month,
      year,
    })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) throw error;
  revalidatePath('/budgets');
  revalidatePath(`/budgets/${id}`);
  revalidatePath('/');
}

export async function deleteBudget(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('budgets')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) throw error;
  revalidatePath('/budgets');
  revalidatePath('/');
}

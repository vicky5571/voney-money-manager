'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

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
  type?: 'income' | 'expense';
  search?: string;
  month?: number;
  year?: number;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  let query = supabase
    .from('transactions')
    .select(`
      id, type, amount, note, transaction_date, created_at,
      categories ( id, name, icon, color ),
      accounts ( id, name )
    `, { count: 'exact' })
    .eq('user_id', user.id)
    .order('transaction_date', { ascending: false })
    .order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  if (type) query = query.eq('type', type);
  if (search) query = query.ilike('note', `%${search}%`);
  if (month && year) {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    query = query.gte('transaction_date', startDate).lte('transaction_date', endDate);
  }

  const { data, count, error } = await query;
  if (error) throw error;

  return { transactions: data ?? [], total: count ?? 0, hasMore: (count ?? 0) > page * limit };
}

export async function getMonthSummary(month: number, year: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  const { data, error } = await supabase
    .from('transactions')
    .select('type, amount')
    .eq('user_id', user.id)
    .gte('transaction_date', startDate)
    .lte('transaction_date', endDate);

  if (error) throw error;

  const income = (data ?? []).filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const expense = (data ?? []).filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);

  return { income, expense, net: income - expense };
}

export async function getTransactionCounts(search?: string, month?: number, year?: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const buildQuery = (type: 'income' | 'expense') => {
    let q = supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('type', type);
    if (search) q = q.ilike('note', `%${search}%`);
    if (month && year) {
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      q = q.gte('transaction_date', startDate).lte('transaction_date', endDate);
    }
    return q;
  };

  const [{ count: incomeCount }, { count: expenseCount }] = await Promise.all([
    buildQuery('income'),
    buildQuery('expense'),
  ]);

  return {
    all: (incomeCount ?? 0) + (expenseCount ?? 0),
    income: incomeCount ?? 0,
    expense: expenseCount ?? 0,
  };
}

export async function getTransactionsForExport({
  month,
  year,
  type,
  search,
}: {
  month?: number;
  year?: number;
  type?: 'income' | 'expense';
  search?: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  let query = supabase
    .from('transactions')
    .select(`
      id, type, amount, note, transaction_date,
      categories ( name ),
      accounts ( name )
    `)
    .eq('user_id', user.id)
    .order('transaction_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (type) query = query.eq('type', type);
  if (search) query = query.ilike('note', `%${search}%`);
  if (month && year) {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    query = query.gte('transaction_date', startDate).lte('transaction_date', endDate);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function createTransaction(formData: {
  type: 'income' | 'expense';
  amount: number;
  category_id: string;
  account_id: string;
  transaction_date: string;
  note?: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase.from('transactions').insert({
    user_id: user.id,
    type: formData.type,
    amount: formData.amount,
    category_id: formData.category_id,
    account_id: formData.account_id,
    transaction_date: formData.transaction_date,
    note: formData.note || null,
  });

  if (error) throw error;

  // Update account balance
  const { data: account } = await supabase
    .from('accounts')
    .select('balance')
    .eq('id', formData.account_id)
    .single();

  if (account) {
    const newBalance = formData.type === 'income'
      ? Number(account.balance) + formData.amount
      : Number(account.balance) - formData.amount;

    await supabase
      .from('accounts')
      .update({ balance: newBalance })
      .eq('id', formData.account_id);
  }

  revalidatePath('/');
  revalidatePath('/transactions');
  revalidatePath('/accounts');
}

export async function updateTransaction(
  id: string,
  formData: {
    type: 'income' | 'expense';
    amount: number;
    category_id: string;
    account_id: string;
    transaction_date: string;
    note?: string;
  }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Get old transaction to reverse its effect on balance
  const { data: oldTransaction } = await supabase
    .from('transactions')
    .select('type, amount, account_id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (!oldTransaction) throw new Error('Transaction not found');

  // Reverse old transaction effect
  const { data: oldAccount } = await supabase
    .from('accounts')
    .select('balance')
    .eq('id', oldTransaction.account_id)
    .single();

  if (oldAccount) {
    const reversedBalance = oldTransaction.type === 'income'
      ? Number(oldAccount.balance) - Number(oldTransaction.amount)
      : Number(oldAccount.balance) + Number(oldTransaction.amount);
    await supabase.from('accounts').update({ balance: reversedBalance }).eq('id', oldTransaction.account_id);
  }

  // Update transaction
  const { error } = await supabase
    .from('transactions')
    .update({
      type: formData.type,
      amount: formData.amount,
      category_id: formData.category_id,
      account_id: formData.account_id,
      transaction_date: formData.transaction_date,
      note: formData.note || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) throw error;

  // Apply new transaction effect
  const { data: newAccount } = await supabase
    .from('accounts')
    .select('balance')
    .eq('id', formData.account_id)
    .single();

  if (newAccount) {
    const newBalance = formData.type === 'income'
      ? Number(newAccount.balance) + formData.amount
      : Number(newAccount.balance) - formData.amount;
    await supabase.from('accounts').update({ balance: newBalance }).eq('id', formData.account_id);
  }

  revalidatePath('/');
  revalidatePath('/transactions');
  revalidatePath('/accounts');
}

export async function deleteTransaction(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Get transaction to reverse balance
  const { data: transaction } = await supabase
    .from('transactions')
    .select('type, amount, account_id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (!transaction) throw new Error('Transaction not found');

  // Delete the transaction
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) throw error;

  // Reverse balance
  const { data: account } = await supabase
    .from('accounts')
    .select('balance')
    .eq('id', transaction.account_id)
    .single();

  if (account) {
    const newBalance = transaction.type === 'income'
      ? Number(account.balance) - Number(transaction.amount)
      : Number(account.balance) + Number(transaction.amount);
    await supabase.from('accounts').update({ balance: newBalance }).eq('id', transaction.account_id);
  }

  revalidatePath('/');
  revalidatePath('/transactions');
  revalidatePath('/accounts');
}

export async function createTransfer(formData: {
  from_account_id: string;
  to_account_id: string;
  amount: number;
  transaction_date: string;
  note?: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  if (formData.from_account_id === formData.to_account_id) {
    throw new Error('Source and destination accounts must be different');
  }

  if (formData.amount <= 0) {
    throw new Error('Transfer amount must be greater than 0');
  }

  // Get source and destination accounts
  const [{ data: fromAccount }, { data: toAccount }] = await Promise.all([
    supabase.from('accounts').select('id, name, balance').eq('id', formData.from_account_id).eq('user_id', user.id).single(),
    supabase.from('accounts').select('id, name, balance').eq('id', formData.to_account_id).eq('user_id', user.id).single(),
  ]);

  if (!fromAccount || !toAccount) throw new Error('Account not found');

  // Find or use a category for transfer logging
  const { data: catData } = await supabase
    .from('categories')
    .select('id')
    .limit(1);
  const fallbackCategoryId = catData?.[0]?.id;

  // Deduct from source account
  await supabase
    .from('accounts')
    .update({ balance: Number(fromAccount.balance) - formData.amount })
    .eq('id', fromAccount.id);

  // Add to destination account
  await supabase
    .from('accounts')
    .update({ balance: Number(toAccount.balance) + formData.amount })
    .eq('id', toAccount.id);

  if (fallbackCategoryId) {
    // Log outbound transfer record
    await supabase.from('transactions').insert({
      user_id: user.id,
      account_id: fromAccount.id,
      category_id: fallbackCategoryId,
      type: 'expense',
      amount: formData.amount,
      transaction_date: formData.transaction_date,
      note: formData.note
        ? `Transfer to ${toAccount.name}: ${formData.note}`
        : `Transfer to ${toAccount.name}`,
    });

    // Log inbound transfer record
    await supabase.from('transactions').insert({
      user_id: user.id,
      account_id: toAccount.id,
      category_id: fallbackCategoryId,
      type: 'income',
      amount: formData.amount,
      transaction_date: formData.transaction_date,
      note: formData.note
        ? `Transfer from ${fromAccount.name}: ${formData.note}`
        : `Transfer from ${fromAccount.name}`,
    });
  }

  revalidatePath('/');
  revalidatePath('/transactions');
  revalidatePath('/accounts');
}

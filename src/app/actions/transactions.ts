'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function getTransactions({
  page = 1,
  limit = 20,
  type,
  search,
}: {
  page?: number;
  limit?: number;
  type?: 'income' | 'expense';
  search?: string;
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

  const { data, count, error } = await query;
  if (error) throw error;

  return { transactions: data ?? [], total: count ?? 0, hasMore: (count ?? 0) > page * limit };
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

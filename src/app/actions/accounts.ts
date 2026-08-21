'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function getAccounts() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .eq('user_id', user.id)
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function createAccount(formData: {
  name: string;
  type: 'cash' | 'bank' | 'e-wallet';
  icon?: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase.from('accounts').insert({
    user_id: user.id,
    name: formData.name,
    type: formData.type,
    icon: formData.icon || 'wallet',
    balance: 0,
  });

  if (error) throw error;
  revalidatePath('/accounts');
  revalidatePath('/');
}

export async function updateAccount(id: string, formData: {
  name: string;
  type: 'cash' | 'bank' | 'e-wallet';
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('accounts')
    .update({ name: formData.name, type: formData.type })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) throw error;
  revalidatePath('/accounts');
  revalidatePath('/');
}

export async function deleteAccount(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Check if this is the last account
  const { data: accounts } = await supabase
    .from('accounts')
    .select('id')
    .eq('user_id', user.id);

  if (accounts && accounts.length <= 1) {
    throw new Error('You must have at least one account');
  }

  // Delete all transactions in this account first
  await supabase
    .from('transactions')
    .delete()
    .eq('account_id', id)
    .eq('user_id', user.id);

  const { error } = await supabase
    .from('accounts')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) throw error;
  revalidatePath('/accounts');
  revalidatePath('/');
  revalidatePath('/transactions');
}

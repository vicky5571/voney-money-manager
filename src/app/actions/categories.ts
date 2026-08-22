'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function getCategories() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .or(`user_id.eq.${user.id},is_default.eq.true`)
    .order('is_default', { ascending: false })
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function createCategory(formData: {
  name: string;
  icon: string;
  color: string;
  type: 'income' | 'expense';
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  if (!formData.name.trim()) {
    throw new Error('Category name is required');
  }

  const { data, error } = await supabase
    .from('categories')
    .insert({
      user_id: user.id,
      name: formData.name.trim(),
      icon: formData.icon,
      color: formData.color,
      type: formData.type,
      is_default: false,
      sort_order: 100,
    })
    .select()
    .single();

  if (error) throw error;

  revalidatePath('/add');
  revalidatePath('/budgets');
  revalidatePath('/categories');
  return data;
}

export async function updateCategory(
  id: string,
  formData: {
    name: string;
    icon: string;
    color: string;
    type: 'income' | 'expense';
  }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  if (!formData.name.trim()) {
    throw new Error('Category name is required');
  }

  const { error } = await supabase
    .from('categories')
    .update({
      name: formData.name.trim(),
      icon: formData.icon,
      color: formData.color,
      type: formData.type,
    })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) throw error;

  revalidatePath('/add');
  revalidatePath('/budgets');
  revalidatePath('/categories');
}

export async function deleteCategory(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Check if category is a default system category
  const { data: existing } = await supabase
    .from('categories')
    .select('is_default, user_id')
    .eq('id', id)
    .single();

  if (!existing || existing.is_default || existing.user_id !== user.id) {
    throw new Error('System default categories cannot be deleted');
  }

  // Delete category
  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) throw error;

  revalidatePath('/add');
  revalidatePath('/budgets');
  revalidatePath('/categories');
}

'use server';

import { createClient } from '@/lib/supabase/server';

export async function getCategories() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .or(`user_id.eq.${user.id},is_default.eq.true`)
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

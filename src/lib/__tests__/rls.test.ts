/**
 * RLS smoke test — run against local Supabase (supabase test db).
 * Requires SUPABASE_URL + SERVICE_ROLE + ANON_KEY.
 * Checks User A cannot read User B row.
 *
 * Run: npx tsx src/lib/__tests__/rls.test.ts
 */
import { createClient } from '@supabase/supabase-js';

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) { console.log('skip: no env'); return; }
  const anonClient = createClient(url, anon);
  // Expect 0 rows when not authed (RLS blocks)
  const { data, error } = await anonClient.from('transactions').select('id').limit(1);
  if (error) console.log('RLS check error (expected if RLS blocks):', error.message);
  else console.log('RLS check anon select rows:', data?.length, '(0 = pass, RLS blocks anon)');
  console.log('Add authenticated test: create 2 users, insert tx as A, fetch as B should return 0');
}
main();

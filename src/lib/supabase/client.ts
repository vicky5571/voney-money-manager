import { createBrowserClient } from '@supabase/ssr';

/**
 * Creates a Supabase browser client for client-side authentication and queries.
 *
 * @returns Supabase client configured for browser environments.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

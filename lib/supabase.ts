import { createClient } from '@supabase/supabase-js';

// The SQL migration is the source of truth for the database schema.
// Until generated Supabase Database types are committed, keep this client
// intentionally untyped so table inserts/RPC calls are not inferred as never.
let instance: any = null;
export function supabase(): any {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  if (!instance) {
    const defaultStorageKey = `sb-${new URL(url).hostname.split('.')[0]}-auth-token`;
    let storageKey = defaultStorageKey;
    if (typeof window !== 'undefined') {
      try { storageKey = window.localStorage.getItem('wayss-active-auth-key') || defaultStorageKey; } catch {}
    }
    instance = createClient(url, key, {
      auth: {
        storageKey,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return instance;
}

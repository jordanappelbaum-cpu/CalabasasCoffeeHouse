'use client';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Browser Supabase client for the admin dashboard.
 *
 * Authorization is enforced by Row Level Security in the database, not by this
 * app. The policies added in migration 021 gate every admin table on
 * `is_admin(auth.uid())`, so a non-admin session reaching these pages simply
 * sees nothing — hiding the UI is a convenience, not the security boundary.
 */

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

let client: SupabaseClient | null = null;

export function supabase(): SupabaseClient {
  if (!client) {
    client = createClient(URL, ANON, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
  }
  return client;
}

/** Call an edge function with the current admin's JWT attached. */
export async function callAdminFunction<T>(fn: string, body: unknown): Promise<T> {
  const sb = supabase();
  const {
    data: { session },
  } = await sb.auth.getSession();

  if (!session) throw new Error('Not signed in');

  const res = await fetch(`${URL}/functions/v1/${fn}`, {
    method: 'POST',
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e = (payload as { error?: { message?: string } }).error;
    throw new Error(e?.message ?? 'Request failed');
  }
  return payload as T;
}

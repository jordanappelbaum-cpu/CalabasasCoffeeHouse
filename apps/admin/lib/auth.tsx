'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { supabase } from './supabase';

interface AuthState {
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  user: null,
  isAdmin: false,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const sb = supabase();

    /**
     * Confirm the admin flag against the database rather than trusting
     * anything in the session. The RLS policies are the real gate, but this
     * keeps a non-admin from being shown an empty dashboard and left confused.
     */
    async function resolve(u: User | null) {
      if (!u) {
        setUser(null);
        setIsAdmin(false);
        setLoading(false);
        return;
      }
      const { data } = await sb.from('profiles').select('is_admin').eq('id', u.id).single();
      setUser(u);
      setIsAdmin(Boolean(data?.is_admin));
      setLoading(false);
    }

    sb.auth.getSession().then(({ data }) => resolve(data.session?.user ?? null));

    const {
      data: { subscription },
    } = sb.auth.onAuthStateChange((_event, session) => {
      resolve(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Bounce unauthenticated visitors to the login page.
  useEffect(() => {
    if (loading) return;
    if (!user && pathname !== '/login') router.replace('/login');
    if (user && isAdmin && pathname === '/login') router.replace('/');
  }, [user, isAdmin, loading, pathname, router]);

  async function signOut() {
    await supabase().auth.signOut();
    router.replace('/login');
  }

  return (
    <AuthContext.Provider value={{ user, isAdmin, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

/** Wraps every page except /login. Renders nothing until admin status is known. */
export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, loading, signOut } = useAuth();

  if (loading) {
    return <div className="p-16 text-center text-slate-500">Checking access…</div>;
  }

  if (!user) return null; // redirect already in flight

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-md p-16 text-center">
        <h1 className="text-xl font-semibold text-slate-900">No access</h1>
        <p className="mt-2 text-sm text-slate-600">
          This account isn&apos;t an admin. Ask someone with dashboard access to
          enable it for {user.email}.
        </p>
        <button onClick={signOut} className="btn-secondary mt-6">
          Sign out
        </button>
      </div>
    );
  }

  return <>{children}</>;
}

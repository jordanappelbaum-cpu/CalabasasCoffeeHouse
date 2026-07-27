'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * Sign-in only — there is deliberately no sign-up.
 *
 * Dashboard access is granted by setting profiles.is_admin on an existing
 * account, so there is no self-serve path in and nothing here to enumerate.
 */
export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const { error: signInError } = await supabase().auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError) {
      // Generic on purpose: never reveal whether an address has an account.
      setError('Those details did not work.');
      setBusy(false);
      return;
    }
    // AuthProvider redirects once it has confirmed the admin flag.
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-cch-cream px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-center text-xl font-semibold text-cch-blue">
          Calabasas Coffee House
        </h1>
        <p className="mt-1 text-center text-sm text-slate-500">Shop administration</p>

        <form onSubmit={submit} className="card mt-8 space-y-4 p-6">
          <div>
            <label htmlFor="email" className="label">Email</label>
            <input
              id="email"
              type="email"
              className="field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              required
              autoFocus
            />
          </div>

          <div>
            <label htmlFor="password" className="label">Password</label>
            <input
              id="password"
              type="password"
              className="field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          {error && (
            <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}

          <button type="submit" disabled={busy} className="btn-primary w-full">
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="mt-5 text-center text-xs text-slate-400">
          Access is granted by an existing admin. There is no sign-up.
        </p>
      </div>
    </div>
  );
}

'use client';

import { useCallback, useEffect, useState } from 'react';
import { formatPrice } from '@cch/shared';
import type { DiscountCode } from '@cch/shared';
import { supabase } from '@/lib/supabase';

export default function DiscountsPage() {
  const [codes, setCodes] = useState<DiscountCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const [draft, setDraft] = useState({
    code: '',
    kind: 'percent' as 'percent' | 'fixed',
    value: '10',
    min_subtotal: '0',
    free_shipping: false,
    max_redemptions: '',
    ends_at: '',
  });

  const load = useCallback(async () => {
    const { data } = await supabase()
      .from('discount_codes')
      .select('*')
      .order('created_at', { ascending: false });
    setCodes((data ?? []) as DiscountCode[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const value =
        draft.kind === 'percent'
          ? Math.round(Number(draft.value))
          : Math.round(Number(draft.value) * 100);

      if (draft.kind === 'percent' && (value <= 0 || value > 100)) {
        throw new Error('A percentage discount must be between 1 and 100');
      }
      if (value <= 0) throw new Error('Value must be greater than zero');

      const { error: e2 } = await supabase()
        .from('discount_codes')
        .insert({
          code: draft.code.trim().toUpperCase(),
          kind: draft.kind,
          value,
          min_subtotal_cents: Math.round(Number(draft.min_subtotal) * 100),
          free_shipping: draft.free_shipping,
          max_redemptions: draft.max_redemptions ? Number(draft.max_redemptions) : null,
          ends_at: draft.ends_at ? new Date(draft.ends_at).toISOString() : null,
          active: true,
        });
      if (e2) throw e2;

      setDraft({ ...draft, code: '', value: '10', min_subtotal: '0', max_redemptions: '', ends_at: '' });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the code');
    } finally {
      setCreating(false);
    }
  }

  async function toggle(code: DiscountCode) {
    await supabase()
      .from('discount_codes')
      .update({ active: !code.active })
      .eq('id', code.id);
    await load();
  }

  if (loading) return <p className="text-slate-500">Loading…</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Discount codes</h1>
        <p className="mt-1 text-sm text-slate-500">
          Codes are checked on the server at checkout. They are never listed publicly.
        </p>
      </div>

      <form onSubmit={create} className="card space-y-4 p-5">
        <h2 className="font-medium">New code</h2>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="label">Code</label>
            <input
              className="field font-mono uppercase"
              value={draft.code}
              onChange={(e) => setDraft({ ...draft, code: e.target.value.toUpperCase() })}
              placeholder="WELCOME10"
              required
            />
          </div>
          <div>
            <label className="label">Type</label>
            <select
              className="field"
              value={draft.kind}
              onChange={(e) => setDraft({ ...draft, kind: e.target.value as 'percent' | 'fixed' })}
            >
              <option value="percent">Percent off</option>
              <option value="fixed">Fixed amount off</option>
            </select>
          </div>
          <div>
            <label className="label">
              {draft.kind === 'percent' ? 'Percent (1–100)' : 'Amount in dollars'}
            </label>
            <input
              type="number"
              step={draft.kind === 'percent' ? '1' : '0.01'}
              min="0"
              className="field"
              value={draft.value}
              onChange={(e) => setDraft({ ...draft, value: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="label">Minimum spend ($)</label>
            <input
              type="number" step="0.01" min="0" className="field"
              value={draft.min_subtotal}
              onChange={(e) => setDraft({ ...draft, min_subtotal: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Max uses (blank = unlimited)</label>
            <input
              type="number" min="1" className="field"
              value={draft.max_redemptions}
              onChange={(e) => setDraft({ ...draft, max_redemptions: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Expires (blank = never)</label>
            <input
              type="date" className="field"
              value={draft.ends_at}
              onChange={(e) => setDraft({ ...draft, ends_at: e.target.value })}
            />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={draft.free_shipping}
            onChange={(e) => setDraft({ ...draft, free_shipping: e.target.checked })}
            className="accent-cch-blue"
          />
          Also grants free shipping
        </label>

        {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        <button type="submit" disabled={creating} className="btn-primary">
          {creating ? 'Creating…' : 'Create code'}
        </button>
      </form>

      <div className="card overflow-hidden">
        {codes.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">No codes yet.</p>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="th">Code</th>
                <th className="th">Discount</th>
                <th className="th">Minimum</th>
                <th className="th">Used</th>
                <th className="th">Expires</th>
                <th className="th"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {codes.map((c) => (
                <tr key={c.id} className={c.active ? '' : 'opacity-50'}>
                  <td className="td font-mono font-medium">{c.code}</td>
                  <td className="td">
                    {c.kind === 'percent' ? `${c.value}% off` : `${formatPrice(c.value)} off`}
                    {c.free_shipping && (
                      <span className="ml-2 text-xs text-cch-blue">+ free shipping</span>
                    )}
                  </td>
                  <td className="td text-slate-500">
                    {c.min_subtotal_cents > 0 ? formatPrice(c.min_subtotal_cents) : '—'}
                  </td>
                  <td className="td tabular-nums text-slate-500">
                    {c.times_redeemed}
                    {c.max_redemptions ? ` / ${c.max_redemptions}` : ''}
                  </td>
                  <td className="td text-slate-500">
                    {c.ends_at ? new Date(c.ends_at).toLocaleDateString() : '—'}
                  </td>
                  <td className="td text-right">
                    <button onClick={() => toggle(c)} className="text-sm text-cch-blue underline">
                      {c.active ? 'Disable' : 'Enable'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

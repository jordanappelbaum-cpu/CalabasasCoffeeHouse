'use client';

import { useEffect, useState } from 'react';
import { formatPrice } from '@cch/shared';
import type { ShopSettings } from '@cch/shared';
import { supabase } from '@/lib/supabase';

export default function SettingsPage() {
  const [settings, setSettings] = useState<ShopSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase()
      .from('shop_settings')
      .select('*')
      .eq('id', true)
      .single()
      .then(({ data }) => {
        setSettings(data as ShopSettings);
        setLoading(false);
      });
  }, []);

  async function save() {
    if (!settings) return;
    setSaving(true);
    setError(null);
    try {
      const { error: e } = await supabase()
        .from('shop_settings')
        .update({
          free_shipping_threshold_cents: settings.free_shipping_threshold_cents,
          store_accepting_orders: settings.store_accepting_orders,
          announcement_banner: settings.announcement_banner || null,
          default_item_weight_oz: settings.default_item_weight_oz,
          ship_from_name: settings.ship_from_name,
          ship_from_street1: settings.ship_from_street1,
          ship_from_street2: settings.ship_from_street2,
          ship_from_city: settings.ship_from_city,
          ship_from_state: settings.ship_from_state,
          ship_from_zip: settings.ship_from_zip,
          ship_from_phone: settings.ship_from_phone,
          ship_from_email: settings.ship_from_email,
        })
        .eq('id', true);
      if (e) throw e;
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-slate-500">Loading…</p>;
  if (!settings) return <p className="text-slate-500">No settings row found.</p>;

  const set = <K extends keyof ShopSettings>(k: K, v: ShopSettings[K]) =>
    setSettings({ ...settings, [k]: v });

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>

      <section className="card p-5">
        <h2 className="font-medium">Storefront</h2>

        <div className="mt-4 space-y-4">
          <div>
            <label htmlFor="threshold" className="label">
              Free shipping over ({formatPrice(settings.free_shipping_threshold_cents)})
            </label>
            <input
              id="threshold"
              type="number"
              step="1"
              min="0"
              className="field"
              value={(settings.free_shipping_threshold_cents / 100).toFixed(0)}
              onChange={(e) =>
                set('free_shipping_threshold_cents', Math.round(Number(e.target.value) * 100))
              }
            />
            <p className="mt-1 text-xs text-slate-500">
              Measured on the subtotal after any discount. Set very high to
              effectively turn free shipping off.
            </p>
          </div>

          <div>
            <label htmlFor="banner" className="label">Announcement banner</label>
            <input
              id="banner"
              className="field"
              value={settings.announcement_banner ?? ''}
              onChange={(e) => set('announcement_banner', e.target.value)}
              placeholder="Shown across the top of the shop. Leave blank to hide."
            />
          </div>

          <label className="flex items-start gap-2.5 text-sm">
            <input
              type="checkbox"
              checked={settings.store_accepting_orders}
              onChange={(e) => set('store_accepting_orders', e.target.checked)}
              className="mt-0.5 accent-cch-blue"
            />
            <span>
              <span className="font-medium">Accepting orders</span>
              <span className="block text-slate-500">
                Unchecking this stops all new checkouts immediately. Products stay
                visible. Use it when you&apos;re away and can&apos;t ship.
              </span>
            </span>
          </label>
        </div>
      </section>

      <section className="card p-5">
        <h2 className="font-medium">Ship from</h2>
        <p className="mt-1 text-sm text-slate-500">
          The return address on every label and the origin for shipping rates.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label">Business name</label>
            <input className="field" value={settings.ship_from_name}
              onChange={(e) => set('ship_from_name', e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Street</label>
            <input className="field" value={settings.ship_from_street1}
              onChange={(e) => set('ship_from_street1', e.target.value)} />
          </div>
          <div>
            <label className="label">Suite</label>
            <input className="field" value={settings.ship_from_street2 ?? ''}
              onChange={(e) => set('ship_from_street2', e.target.value)} />
          </div>
          <div>
            <label className="label">City</label>
            <input className="field" value={settings.ship_from_city}
              onChange={(e) => set('ship_from_city', e.target.value)} />
          </div>
          <div>
            <label className="label">State</label>
            <input className="field" maxLength={2} value={settings.ship_from_state}
              onChange={(e) => set('ship_from_state', e.target.value.toUpperCase())} />
          </div>
          <div>
            <label className="label">ZIP</label>
            <input className="field" value={settings.ship_from_zip}
              onChange={(e) => set('ship_from_zip', e.target.value)} />
          </div>
          <div>
            <label className="label">Phone</label>
            <input className="field" value={settings.ship_from_phone ?? ''}
              onChange={(e) => set('ship_from_phone', e.target.value)} />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="field" value={settings.ship_from_email ?? ''}
              onChange={(e) => set('ship_from_email', e.target.value)} />
          </div>
        </div>
      </section>

      <section className="card p-5">
        <h2 className="font-medium">Shipping defaults</h2>
        <p className="mt-1 text-sm text-slate-500">
          Used only when a variant has no weight of its own.
        </p>
        <div className="mt-4 max-w-40">
          <label className="label">Default item weight (oz)</label>
          <input
            type="number" step="0.1" min="0.1" className="field"
            value={settings.default_item_weight_oz}
            onChange={(e) => set('default_item_weight_oz', Number(e.target.value))}
          />
        </div>
      </section>

      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="flex items-center gap-3">
        <button onClick={save} disabled={saving} className="btn-primary">
          {saving ? 'Saving…' : 'Save settings'}
        </button>
        {saved && <span className="text-sm text-emerald-600">Saved</span>}
      </div>
    </div>
  );
}

'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { formatPrice } from '@cch/shared';
import type { ProductStatus } from '@cch/shared';
import { supabase } from '@/lib/supabase';

interface Variant {
  id: string;
  product_id: string;
  title: string;
  sku: string;
  price_cents: number;
  inventory_qty: number;
  low_stock_threshold: number;
  active: boolean;
  weight_oz: number | null;
  sort_order: number;
}

interface Product {
  id: string;
  title: string;
  slug: string;
  status: ProductStatus;
  sort_order: number;
}

const STATUSES: Array<{ value: ProductStatus; label: string; hint: string }> = [
  { value: 'active', label: 'Active', hint: 'Listed and buyable' },
  { value: 'coming_soon', label: 'Coming soon', hint: 'Listed, not buyable' },
  { value: 'draft', label: 'Draft', hint: 'Hidden everywhere' },
  { value: 'archived', label: 'Archived', hint: 'Hidden, history kept' },
];

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [images, setImages] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const sb = supabase();
    const [{ data: p }, { data: v }, { data: img }] = await Promise.all([
      sb.from('products').select('id, title, slug, status, sort_order').order('sort_order'),
      sb.from('product_variants').select('*').order('sort_order'),
      sb.from('product_images').select('product_id, image_path, sort_order').order('sort_order'),
    ]);

    setProducts((p ?? []) as Product[]);
    setVariants((v ?? []) as Variant[]);

    const first: Record<string, string> = {};
    for (const row of (img ?? []) as Array<{ product_id: string; image_path: string }>) {
      if (!first[row.product_id]) {
        first[row.product_id] = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/merch/${row.image_path}`;
      }
    }
    setImages(first);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function flashSaved(key: string) {
    setSaved(key);
    setTimeout(() => setSaved((s) => (s === key ? null : s)), 1500);
  }

  /**
   * Stock edits go through adjust_inventory rather than a bare UPDATE, so
   * every change lands in inventory_adjustments with who and why. A raw
   * update would leave an unexplained number with no history.
   */
  async function setStock(variant: Variant, next: number) {
    const delta = next - variant.inventory_qty;
    if (!Number.isFinite(next) || next < 0 || delta === 0) return;

    setSaving(variant.id);
    setError(null);
    try {
      const sb = supabase();
      const { data: user } = await sb.auth.getUser();
      const { error: e } = await sb.rpc('adjust_inventory', {
        p_variant_id: variant.id,
        p_delta: delta,
        p_reason: 'manual_admin_edit',
        p_order_id: null,
        p_actor_id: user.user?.id ?? null,
        p_note: null,
      });
      if (e) throw e;
      setVariants((prev) =>
        prev.map((v) => (v.id === variant.id ? { ...v, inventory_qty: next } : v))
      );
      flashSaved(variant.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update stock');
    } finally {
      setSaving(null);
    }
  }

  async function setPrice(variant: Variant, dollars: string) {
    const cents = Math.round(parseFloat(dollars) * 100);
    if (!Number.isFinite(cents) || cents < 0 || cents === variant.price_cents) return;

    setSaving(variant.id);
    try {
      const { error: e } = await supabase()
        .from('product_variants')
        .update({ price_cents: cents })
        .eq('id', variant.id);
      if (e) throw e;
      setVariants((prev) =>
        prev.map((v) => (v.id === variant.id ? { ...v, price_cents: cents } : v))
      );
      flashSaved(variant.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update price');
    } finally {
      setSaving(null);
    }
  }

  async function setWeight(variant: Variant, oz: string) {
    const value = oz === '' ? null : Number(oz);
    if (value !== null && (!Number.isFinite(value) || value <= 0)) return;

    setSaving(variant.id);
    try {
      await supabase().from('product_variants').update({ weight_oz: value }).eq('id', variant.id);
      setVariants((prev) =>
        prev.map((v) => (v.id === variant.id ? { ...v, weight_oz: value } : v))
      );
      flashSaved(variant.id);
    } finally {
      setSaving(null);
    }
  }

  async function setStatus(product: Product, status: ProductStatus) {
    setSaving(product.id);
    try {
      const { error: e } = await supabase()
        .from('products')
        .update({ status })
        .eq('id', product.id);
      if (e) throw e;
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, status } : p))
      );
      flashSaved(product.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update status');
    } finally {
      setSaving(null);
    }
  }

  if (loading) return <p className="text-slate-500">Loading inventory…</p>;

  const missingWeights = variants.filter((v) => v.weight_oz === null).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Inventory</h1>
        <p className="mt-1 text-sm text-slate-500">
          Changes save immediately and go live on the website within a minute.
        </p>
      </div>

      {missingWeights > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <strong>{missingWeights} variant{missingWeights === 1 ? '' : 's'} have no shipping weight.</strong>{' '}
          Those fall back to a default estimate, so shipping quotes may be off — most
          for heavy things like coffee bags. Set a weight to fix it.
        </div>
      )}

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
      )}

      <div className="space-y-5">
        {products.map((product) => {
          const rows = variants.filter((v) => v.product_id === product.id);
          return (
            <div key={product.id} className="card overflow-hidden">
              <div className="flex flex-wrap items-center gap-4 border-b border-slate-200 p-4">
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                  {images[product.id] && (
                    <Image src={images[product.id]} alt="" fill sizes="56px" className="object-cover" />
                  )}
                </div>

                <div className="flex-1">
                  <h2 className="font-medium">{product.title}</h2>
                  <p className="font-mono text-xs text-slate-500">/{product.slug}</p>
                </div>

                <div>
                  <label className="label" htmlFor={`status-${product.id}`}>Visibility</label>
                  <select
                    id={`status-${product.id}`}
                    value={product.status}
                    onChange={(e) => setStatus(product, e.target.value as ProductStatus)}
                    className="field w-44"
                  >
                    {STATUSES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label} — {s.hint}
                      </option>
                    ))}
                  </select>
                </div>

                {saved === product.id && (
                  <span className="text-sm text-emerald-600">Saved</span>
                )}
              </div>

              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="th">Variant</th>
                    <th className="th">SKU</th>
                    <th className="th w-32">Price</th>
                    <th className="th w-32">In stock</th>
                    <th className="th w-32">Weight (oz)</th>
                    <th className="th w-20"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((v) => (
                    <tr key={v.id} className={v.inventory_qty === 0 ? 'bg-red-50/40' : undefined}>
                      <td className="td font-medium">{v.title}</td>
                      <td className="td font-mono text-xs text-slate-500">{v.sku}</td>
                      <td className="td">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          defaultValue={(v.price_cents / 100).toFixed(2)}
                          onBlur={(e) => setPrice(v, e.target.value)}
                          className="field tabular-nums"
                          aria-label={`Price for ${v.sku}`}
                        />
                      </td>
                      <td className="td">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          defaultValue={v.inventory_qty}
                          onBlur={(e) => setStock(v, parseInt(e.target.value, 10))}
                          className={`field tabular-nums ${
                            v.inventory_qty === 0 ? 'border-red-300' : ''
                          }`}
                          aria-label={`Stock for ${v.sku}`}
                        />
                      </td>
                      <td className="td">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          defaultValue={v.weight_oz ?? ''}
                          placeholder="default"
                          onBlur={(e) => setWeight(v, e.target.value)}
                          className={`field tabular-nums ${
                            v.weight_oz === null ? 'border-amber-300' : ''
                          }`}
                          aria-label={`Weight for ${v.sku}`}
                        />
                      </td>
                      <td className="td text-right text-xs">
                        {saving === v.id && <span className="text-slate-400">Saving…</span>}
                        {saved === v.id && <span className="text-emerald-600">Saved</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-slate-400">
        Price and stock changes apply to new orders only. Every stock change is
        recorded with who made it.
      </p>
    </div>
  );
}

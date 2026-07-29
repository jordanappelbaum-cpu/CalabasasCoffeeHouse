'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ProductCategory, ProductLineId, ProductStatus } from '@cch/shared';
import { createProduct, createVariant, CATEGORIES, VARIANT_PRESETS, slugify } from '@/lib/products';

/**
 * Create a product, its starting variants, and go straight to the editor so
 * photos can be added. Deliberately one screen — a new product should not be
 * a five-step wizard.
 */
export default function NewProductPage() {
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ProductCategory>('apparel');
  const [status, setStatus] = useState<ProductStatus>('draft');
  const [preset, setPreset] = useState<string>('One size');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('0');
  const [weight, setWeight] = useState('');
  const [skuBase, setSkuBase] = useState('');

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The line follows the category, matching the database trigger that forces
  // coffee and matcha into Good Things Brewing.
  const line: ProductLineId =
    CATEGORIES.find((c) => c.value === category)?.line ?? 'merch';

  const sizes = VARIANT_PRESETS[preset] ?? ['OS'];
  const autoSku = skuBase.trim() || `CCH-${slugify(title) || 'item'}`;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const priceCents = Math.round(parseFloat(price) * 100);
    if (!title.trim()) return setError('Give the product a name');
    if (!Number.isFinite(priceCents) || priceCents <= 0) return setError('Enter a price');

    setBusy(true);
    try {
      const productId = await createProduct({
        title,
        description,
        product_line: line,
        category,
        status,
      });

      // One variant per size, all sharing the entered price and stock.
      // Individual values can be adjusted afterwards on the Inventory page.
      for (let i = 0; i < sizes.length; i++) {
        const size = sizes[i];
        await createVariant({
          product_id: productId,
          title: size,
          sku: sizes.length === 1 ? autoSku : `${autoSku}-${size.replace(/\s+/g, '')}`,
          price_cents: priceCents,
          inventory_qty: Math.max(0, parseInt(stock, 10) || 0),
          weight_oz: weight ? Number(weight) : null,
          length_in: null,
          width_in: null,
          height_in: null,
          sort_order: i,
        });
      }

      router.push(`/products/${productId}?created=1`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the product');
      setBusy(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href="/products" className="text-sm text-cch-blue underline">
          ← Inventory
        </Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">New product</h1>
        <p className="mt-1 text-sm text-slate-500">
          Creates the product and its sizes. You&apos;ll add photos on the next screen.
        </p>
      </div>

      <form onSubmit={submit} className="space-y-6">
        <section className="card space-y-4 p-5">
          <div>
            <label htmlFor="title" className="label">Name</label>
            <input
              id="title"
              className="field"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="CCH House Blend"
              required
              autoFocus
            />
            {title && (
              <p className="mt-1 text-xs text-slate-500">
                Web address: /products/<span className="font-mono">{slugify(title)}</span>
              </p>
            )}
          </div>

          <div>
            <label htmlFor="description" className="label">Description</label>
            <textarea
              id="description"
              rows={4}
              className="field resize-y"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Shown on the product page. Tasting notes, fit, materials — whatever a customer needs to decide."
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="category" className="label">Category</label>
              <select
                id="category"
                className="field"
                value={category}
                onChange={(e) => setCategory(e.target.value as ProductCategory)}
              >
                <optgroup label="CCH Merch">
                  {CATEGORIES.filter((c) => c.line === 'merch').map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </optgroup>
                <optgroup label="Good Things Brewing">
                  {CATEGORIES.filter((c) => c.line === 'good_things_brewing').map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </optgroup>
              </select>
              <p className="mt-1 text-xs text-slate-500">
                Appears under{' '}
                <strong>{line === 'merch' ? 'CCH Merch' : 'Good Things Brewing'}</strong>
              </p>
            </div>

            <div>
              <label htmlFor="status" className="label">Visibility</label>
              <select
                id="status"
                className="field"
                value={status}
                onChange={(e) => setStatus(e.target.value as ProductStatus)}
              >
                <option value="draft">Draft — hidden everywhere</option>
                <option value="coming_soon">Coming soon — visible, not buyable</option>
                <option value="active">Active — visible and buyable</option>
              </select>
              <p className="mt-1 text-xs text-slate-500">
                Start as draft, add photos, then switch it on.
              </p>
            </div>
          </div>
        </section>

        <section className="card space-y-4 p-5">
          <h2 className="font-medium">Sizes &amp; pricing</h2>

          <div>
            <label htmlFor="preset" className="label">Sizes</label>
            <select
              id="preset"
              className="field"
              value={preset}
              onChange={(e) => setPreset(e.target.value)}
            >
              {Object.keys(VARIANT_PRESETS).map((k) => (
                <option key={k} value={k}>
                  {k} ({VARIANT_PRESETS[k].join(', ')})
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="price" className="label">Price ($)</label>
              <input
                id="price" type="number" step="0.01" min="0" className="field"
                value={price} onChange={(e) => setPrice(e.target.value)}
                placeholder="30.00" required
              />
            </div>
            <div>
              <label htmlFor="stock" className="label">Stock, each size</label>
              <input
                id="stock" type="number" min="0" step="1" className="field"
                value={stock} onChange={(e) => setStock(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="weight" className="label">Weight (oz)</label>
              <input
                id="weight" type="number" step="0.1" min="0" className="field"
                value={weight} onChange={(e) => setWeight(e.target.value)}
                placeholder="optional"
              />
            </div>
          </div>

          <p className="text-xs text-slate-500">
            Weight drives shipping quotes. Leave blank and it falls back to the
            default estimate — fine for a sticker, badly wrong for a 2&nbsp;lb bag
            of beans.
          </p>

          <div>
            <label htmlFor="sku" className="label">SKU prefix</label>
            <input
              id="sku" className="field font-mono"
              value={skuBase} onChange={(e) => setSkuBase(e.target.value)}
              placeholder={autoSku}
            />
            <p className="mt-1 text-xs text-slate-500">
              Will create:{' '}
              <span className="font-mono">
                {sizes.length === 1
                  ? autoSku
                  : sizes.map((s) => `${autoSku}-${s.replace(/\s+/g, '')}`).join(', ')}
              </span>
            </p>
          </div>
        </section>

        {error && (
          <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
        )}

        <div className="flex gap-3">
          <button type="submit" disabled={busy} className="btn-primary">
            {busy ? 'Creating…' : 'Create & add photos'}
          </button>
          <Link href="/products" className="btn-secondary">Cancel</Link>
        </div>
      </form>
    </div>
  );
}

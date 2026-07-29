'use client';

import { use, useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ProductCategory, ProductLineId, ProductStatus } from '@cch/shared';
import { supabase } from '@/lib/supabase';
import {
  CATEGORIES,
  publicImageUrl,
  uploadProductImage,
  deleteProductImage,
  createVariant,
} from '@/lib/products';

interface ProductRow {
  id: string;
  title: string;
  description: string | null;
  slug: string;
  status: ProductStatus;
  category: ProductCategory | null;
  product_line: ProductLineId;
  seo_title: string | null;
  seo_description: string | null;
}

interface ImageRow {
  id: string;
  image_path: string;
  alt_text: string | null;
  sort_order: number;
}

interface VariantRow {
  id: string;
  title: string;
  sku: string;
  price_cents: number;
  inventory_qty: number;
  weight_oz: number | null;
  sort_order: number;
  active: boolean;
}

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

export default function ProductEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);

  const [product, setProduct] = useState<ProductRow | null>(null);
  const [images, setImages] = useState<ImageRow[]>([]);
  const [variants, setVariants] = useState<VariantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const sb = supabase();
    const [{ data: p }, { data: img }, { data: v }] = await Promise.all([
      sb.from('products').select('*').eq('id', id).single(),
      sb.from('product_images').select('*').eq('product_id', id).order('sort_order'),
      sb.from('product_variants').select('*').eq('product_id', id).order('sort_order'),
    ]);
    setProduct(p as ProductRow | null);
    setImages((img ?? []) as ImageRow[]);
    setVariants((v ?? []) as VariantRow[]);
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function saveDetails() {
    if (!product) return;
    setSaving(true);
    setError(null);
    try {
      const line: ProductLineId =
        CATEGORIES.find((c) => c.value === product.category)?.line ?? product.product_line;

      const { error: e } = await supabase()
        .from('products')
        .update({
          title: product.title.trim(),
          description: product.description?.trim() || null,
          category: product.category,
          product_line: line,
          status: product.status,
          seo_title: product.seo_title?.trim() || null,
          seo_description: product.seo_description?.trim() || null,
        })
        .eq('id', product.id);
      if (e) throw e;
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save');
    } finally {
      setSaving(false);
    }
  }

  async function handleFiles(files: FileList | null) {
    if (!files?.length || !product) return;
    setUploading(true);
    setError(null);
    try {
      let order = images.length;
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) {
          throw new Error(`${file.name} is not an image`);
        }
        if (file.size > MAX_IMAGE_BYTES) {
          throw new Error(
            `${file.name} is ${(file.size / 1048576).toFixed(1)} MB. Please keep photos under 8 MB — large files slow the shop down badly.`
          );
        }
        await uploadProductImage(product.id, file, order, product.title);
        order += 1;
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  }

  async function removeImage(img: ImageRow) {
    if (!confirm('Delete this photo?')) return;
    try {
      await deleteProductImage(img.id, img.image_path);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete');
    }
  }

  /** Move an image left or right; the first image is what the shop grid shows. */
  async function reorderImage(index: number, delta: number) {
    const next = [...images];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setImages(next);
    const sb = supabase();
    await Promise.all(
      next.map((img, i) =>
        sb.from('product_images').update({ sort_order: i }).eq('id', img.id)
      )
    );
    await load();
  }

  async function addVariant() {
    if (!product) return;
    const title = prompt('Size or variant name (e.g. "L" or "12 oz")');
    if (!title?.trim()) return;
    const sku = prompt('SKU for this variant');
    if (!sku?.trim()) return;
    try {
      await createVariant({
        product_id: product.id,
        title: title.trim(),
        sku: sku.trim(),
        price_cents: variants[0]?.price_cents ?? 0,
        inventory_qty: 0,
        weight_oz: variants[0]?.weight_oz ?? null,
        length_in: null, width_in: null, height_in: null,
        sort_order: variants.length,
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add variant');
    }
  }

  if (loading) return <p className="text-slate-500">Loading…</p>;
  if (!product) return <p className="text-slate-500">Product not found.</p>;

  const line = CATEGORIES.find((c) => c.value === product.category)?.line ?? product.product_line;
  const noPhotos = images.length === 0;

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/products" className="text-sm text-cch-blue underline">← Inventory</Link>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{product.title}</h1>
          <p className="mt-1 font-mono text-xs text-slate-500">/products/{product.slug}</p>
        </div>
        <a
          href={`https://cch-shop.netlify.app/products/${product.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary"
        >
          View on shop
        </a>
      </div>

      {noPhotos && product.status === 'active' && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          This product is live with no photos. It will show an empty tile in the shop.
        </div>
      )}

      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {/* Photos */}
      <section className="card p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-medium">Photos</h2>
            <p className="text-sm text-slate-500">
              The first photo is the one shown in the shop grid.
            </p>
          </div>
          <button
            onClick={() => fileInput.current?.click()}
            disabled={uploading}
            className="btn-primary"
          >
            {uploading ? 'Uploading…' : 'Add photos'}
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>

        {noPhotos ? (
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className="mt-4 flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 py-12 text-slate-500 hover:border-cch-blue hover:text-cch-blue"
          >
            <span className="text-2xl" aria-hidden>＋</span>
            <span className="mt-1 text-sm">Click to upload photos</span>
            <span className="mt-0.5 text-xs text-slate-400">JPG or PNG, up to 8 MB each</span>
          </button>
        ) : (
          <ul className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {images.map((img, i) => (
              <li key={img.id} className="group relative">
                <div className="relative aspect-square overflow-hidden rounded-lg bg-slate-100 ring-1 ring-slate-200">
                  <Image
                    src={publicImageUrl(img.image_path)}
                    alt={img.alt_text ?? ''}
                    fill
                    sizes="200px"
                    className="object-cover"
                  />
                  {i === 0 && (
                    <span className="absolute left-1.5 top-1.5 rounded bg-cch-blue px-1.5 py-0.5 text-[10px] font-medium text-white">
                      Main
                    </span>
                  )}
                </div>
                <div className="mt-1.5 flex items-center justify-between gap-1 text-xs">
                  <div className="flex gap-1">
                    <button
                      onClick={() => reorderImage(i, -1)}
                      disabled={i === 0}
                      className="rounded px-1.5 py-0.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                      aria-label="Move earlier"
                    >←</button>
                    <button
                      onClick={() => reorderImage(i, 1)}
                      disabled={i === images.length - 1}
                      className="rounded px-1.5 py-0.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                      aria-label="Move later"
                    >→</button>
                  </div>
                  <button
                    onClick={() => removeImage(img)}
                    className="rounded px-1.5 py-0.5 text-red-600 hover:bg-red-50"
                  >Delete</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Details */}
      <section className="card space-y-4 p-5">
        <h2 className="font-medium">Details</h2>

        <div>
          <label className="label">Name</label>
          <input
            className="field"
            value={product.title}
            onChange={(e) => setProduct({ ...product, title: e.target.value })}
          />
        </div>

        <div>
          <label className="label">Description</label>
          <textarea
            rows={5}
            className="field resize-y"
            value={product.description ?? ''}
            onChange={(e) => setProduct({ ...product, description: e.target.value })}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Category</label>
            <select
              className="field"
              value={product.category ?? 'apparel'}
              onChange={(e) =>
                setProduct({ ...product, category: e.target.value as ProductCategory })
              }
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
              Shows under <strong>{line === 'merch' ? 'CCH Merch' : 'Good Things Brewing'}</strong>
            </p>
          </div>

          <div>
            <label className="label">Visibility</label>
            <select
              className="field"
              value={product.status}
              onChange={(e) => setProduct({ ...product, status: e.target.value as ProductStatus })}
            >
              <option value="draft">Draft — hidden everywhere</option>
              <option value="coming_soon">Coming soon — visible, not buyable</option>
              <option value="active">Active — visible and buyable</option>
              <option value="archived">Archived — hidden, history kept</option>
            </select>
          </div>
        </div>

        <details className="rounded-lg bg-slate-50 p-3">
          <summary className="cursor-pointer text-sm font-medium text-slate-700">
            Search engine listing (optional)
          </summary>
          <div className="mt-3 space-y-3">
            <div>
              <label className="label">Page title</label>
              <input
                className="field"
                value={product.seo_title ?? ''}
                onChange={(e) => setProduct({ ...product, seo_title: e.target.value })}
                placeholder={product.title}
              />
            </div>
            <div>
              <label className="label">Meta description</label>
              <textarea
                rows={2}
                className="field resize-y"
                value={product.seo_description ?? ''}
                onChange={(e) => setProduct({ ...product, seo_description: e.target.value })}
                placeholder="One or two sentences shown under the link in Google."
              />
            </div>
          </div>
        </details>

        <div className="flex items-center gap-3">
          <button onClick={saveDetails} disabled={saving} className="btn-primary">
            {saving ? 'Saving…' : 'Save changes'}
          </button>
          {saved && <span className="text-sm text-emerald-600">Saved</span>}
        </div>
      </section>

      {/* Variants */}
      <section className="card">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <div>
            <h2 className="font-medium">Sizes</h2>
            <p className="text-sm text-slate-500">
              Edit prices and stock on the <Link href="/products" className="text-cch-blue underline">Inventory</Link> page.
            </p>
          </div>
          <button onClick={addVariant} className="btn-secondary">Add size</button>
        </div>
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="th">Size</th>
              <th className="th">SKU</th>
              <th className="th text-right">Price</th>
              <th className="th text-right">Stock</th>
              <th className="th text-right">Weight</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {variants.map((v) => (
              <tr key={v.id}>
                <td className="td font-medium">{v.title}</td>
                <td className="td font-mono text-xs text-slate-500">{v.sku}</td>
                <td className="td text-right tabular-nums">${(v.price_cents / 100).toFixed(2)}</td>
                <td className={`td text-right tabular-nums ${v.inventory_qty === 0 ? 'text-red-600' : ''}`}>
                  {v.inventory_qty}
                </td>
                <td className="td text-right tabular-nums text-slate-500">
                  {v.weight_oz != null ? `${v.weight_oz} oz` : <span className="text-amber-600">not set</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

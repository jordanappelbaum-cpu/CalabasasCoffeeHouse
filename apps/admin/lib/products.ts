'use client';

/**
 * Product authoring helpers for the admin dashboard.
 *
 * Images go straight from the browser to Supabase Storage. The `merch` bucket
 * is public-read but admin-only for writes (migration 022), so the upload is
 * authorised by the admin's own session rather than by any secret in this app.
 */

import { supabase } from './supabase';
import type { ProductLineId, ProductCategory, ProductStatus } from '@cch/shared';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

export function publicImageUrl(path: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/merch/${path
    .split('/')
    .map(encodeURIComponent)
    .join('/')}`;
}

/** Slug generation mirrors the SQL slugify() in migration 021. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export interface NewProductInput {
  title: string;
  description: string;
  product_line: ProductLineId;
  category: ProductCategory;
  status: ProductStatus;
}

/** Create a product and return its id. Slug is derived and de-duplicated. */
export async function createProduct(input: NewProductInput): Promise<string> {
  const sb = supabase();
  const base = slugify(input.title) || 'product';

  // Find a free slug. The database has a unique index, so this is a
  // convenience to avoid a confusing constraint error, not the real guard.
  const { data: existing } = await sb
    .from('products')
    .select('slug')
    .like('slug', `${base}%`);

  const taken = new Set((existing ?? []).map((r: { slug: string }) => r.slug));
  let slug = base;
  let n = 1;
  while (taken.has(slug)) {
    n += 1;
    slug = `${base}-${n}`;
  }

  const { data: maxRow } = await sb
    .from('products')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await sb
    .from('products')
    .insert({
      title: input.title.trim(),
      description: input.description.trim() || null,
      product_line: input.product_line,
      category: input.category,
      status: input.status,
      slug,
      sort_order: ((maxRow?.sort_order as number | undefined) ?? 0) + 1,
    })
    .select('id')
    .single();

  if (error) throw error;
  return data.id as string;
}

export interface NewVariantInput {
  product_id: string;
  title: string;
  sku: string;
  price_cents: number;
  inventory_qty: number;
  weight_oz: number | null;
  length_in: number | null;
  width_in: number | null;
  height_in: number | null;
  sort_order: number;
}

export async function createVariant(input: NewVariantInput): Promise<void> {
  const { error } = await supabase().from('product_variants').insert(input);
  if (error) {
    // The SKU column is unique; surface that plainly rather than a raw pg error.
    if (String(error.message).includes('duplicate key')) {
      throw new Error(`SKU "${input.sku}" is already used by another variant.`);
    }
    throw error;
  }
}

/**
 * Upload an image to the merch bucket and attach it to a product.
 *
 * Filenames are namespaced by product id and prefixed with a random segment,
 * so re-uploading a file with the same name never overwrites an existing
 * image belonging to another product.
 */
export async function uploadProductImage(
  productId: string,
  file: File,
  sortOrder: number,
  altText?: string
): Promise<{ path: string; url: string }> {
  const sb = supabase();

  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const safeExt = /^[a-z0-9]+$/.test(ext) ? ext : 'jpg';
  const unique = crypto.randomUUID().slice(0, 8);
  const path = `products/${productId}/${unique}.${safeExt}`;

  const { error: uploadError } = await sb.storage
    .from('merch')
    .upload(path, file, { cacheControl: '31536000', upsert: false, contentType: file.type });

  if (uploadError) throw uploadError;

  const { error: rowError } = await sb.from('product_images').insert({
    product_id: productId,
    image_path: path,
    sort_order: sortOrder,
    alt_text: altText?.trim() || null,
  });

  if (rowError) {
    // Don't leave an orphaned object behind if the row insert fails.
    await sb.storage.from('merch').remove([path]);
    throw rowError;
  }

  return { path, url: publicImageUrl(path) };
}

/** Remove an image row and its stored object. */
export async function deleteProductImage(imageId: string, path: string): Promise<void> {
  const sb = supabase();
  const { error } = await sb.from('product_images').delete().eq('id', imageId);
  if (error) throw error;
  // Best-effort: a leftover object is harmless, a missing row is not.
  await sb.storage.from('merch').remove([path]);
}

export const CATEGORIES: Array<{ value: ProductCategory; label: string; line: ProductLineId }> = [
  { value: 'apparel', label: 'Apparel', line: 'merch' },
  { value: 'headwear', label: 'Headwear', line: 'merch' },
  { value: 'drinkware', label: 'Drinkware', line: 'merch' },
  { value: 'accessories', label: 'Accessories', line: 'merch' },
  { value: 'coffee', label: 'Coffee', line: 'good_things_brewing' },
  { value: 'matcha', label: 'Matcha', line: 'good_things_brewing' },
  { value: 'equipment', label: 'Brewing equipment', line: 'good_things_brewing' },
];

/** Sensible starting variants so a new product is one click from sellable. */
export const VARIANT_PRESETS: Record<string, string[]> = {
  'One size': ['OS'],
  'XS–XL': ['XS', 'S', 'M', 'L', 'XL'],
  'S–XL': ['S', 'M', 'L', 'XL'],
  'Bag sizes': ['8 oz', '12 oz', '2 lb'],
};

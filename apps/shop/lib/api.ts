/**
 * Client for the CCH shop edge functions.
 *
 * Every call goes to a Supabase Edge Function rather than to the database
 * directly. Guest orders are invisible to RLS by design (user_id IS NULL), so
 * the functions are the only way to reach them, and they hold the service role
 * and do their own authorization.
 *
 * The anon key below is public by design — it is what RLS is written against.
 */

import type { ProductWithDetails, Quote, ShippingAddress } from '@cch/shared';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const FN = `${SUPABASE_URL}/functions/v1`;

/** Error carrying the stable `code` the edge functions return. */
export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: unknown,
    public status?: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function call<T>(fn: string, body?: unknown, init?: RequestInit): Promise<T> {
  const res = await fetch(`${FN}/${fn}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: {
      apikey: ANON_KEY,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    ...init,
  });

  const text = await res.text();
  let payload: unknown;
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    throw new ApiError('bad_response', 'The server returned an unexpected response', text, res.status);
  }

  if (!res.ok) {
    const e = (payload as { error?: { code: string; message: string; details?: unknown } }).error;
    throw new ApiError(
      e?.code ?? 'unknown',
      e?.message ?? 'Something went wrong',
      e?.details,
      res.status
    );
  }

  return payload as T;
}

// ---------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------

export interface CatalogProduct extends ProductWithDetails {
  purchasable: boolean;
  coming_soon: boolean;
  in_stock: boolean;
  from_price_cents: number | null;
}

export interface CatalogResponse {
  products: CatalogProduct[];
  settings: {
    free_shipping_threshold_cents: number;
    store_accepting_orders: boolean;
    announcement_banner: string | null;
  } | null;
}

export function getCatalog(): Promise<CatalogResponse> {
  return call<CatalogResponse>('shop_get_products', {});
}

export function getProduct(slug: string): Promise<{ product: CatalogProduct | null }> {
  return call<{ product: CatalogProduct | null }>('shop_get_products', { slug });
}

// ---------------------------------------------------------------------------
// Checkout
// ---------------------------------------------------------------------------

export interface QuoteRequest {
  items: Array<{ variantId: string; qty: number }>;
  address?: Partial<ShippingAddress> | null;
  discount_code?: string | null;
  rate_id?: string | null;
}

export function getQuote(req: QuoteRequest): Promise<Quote> {
  return call<Quote>('shop_quote', req);
}

export interface CreateIntentResponse {
  client_secret: string;
  order_id: string;
  order_number: number;
  guest_token: string;
  total_cents: number;
}

export function createPaymentIntent(req: {
  items: Array<{ variantId: string; qty: number }>;
  shipping_address: ShippingAddress;
  rate_id: string;
  discount_code?: string | null;
}): Promise<CreateIntentResponse> {
  return call<CreateIntentResponse>('shop_create_payment_intent', req);
}

// ---------------------------------------------------------------------------
// Order lookup
// ---------------------------------------------------------------------------

export interface LookupResponse {
  order: {
    id: string;
    order_number: number;
    status: string;
    status_label: string;
    created_at: string;
    subtotal_cents: number;
    discount_cents: number;
    shipping_cents: number;
    tax_cents: number;
    total_cents: number;
    free_shipping_applied: boolean;
    tracking_number: string | null;
    tracking_url_provider: string | null;
    shipping_name: string;
    shipping_address1: string;
    shipping_address2: string | null;
    shipping_city: string;
    shipping_state: string;
    shipping_zip: string;
    shipping_country: string;
  };
  items: Array<{
    title: string;
    variant_title: string;
    qty: number;
    unit_price_cents: number;
    line_total_cents: number;
  }>;
}

export function lookupOrder(
  args: { guest_token: string } | { order_number: number; email: string }
): Promise<LookupResponse> {
  return call<LookupResponse>('shop_lookup_order', args);
}

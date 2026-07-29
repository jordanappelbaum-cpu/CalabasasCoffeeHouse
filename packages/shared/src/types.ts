/**
 * Shared domain types for the CCH web store and admin dashboard.
 *
 * These mirror the Supabase schema after migration 021. Where a field was
 * added by 021 it is marked, because the mobile app's own src/types/shop.ts
 * predates it and will not have the field until that app is rebuilt.
 */

// ---------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------

/**
 * Visibility state. Replaces the bare `active` boolean, which is retained in
 * the database and kept in sync by trigger so the shipping mobile app keeps
 * working unchanged.
 *
 *  - draft:       invisible everywhere
 *  - coming_soon: listed on the web store but not purchasable (coffee/matcha bags)
 *  - active:      listed and purchasable
 *  - archived:    hidden, retained so historical orders still resolve
 */
export type ProductStatus = 'draft' | 'coming_soon' | 'active' | 'archived';

/**
 * The two customer-facing lines. They share one cart and one checkout, so a
 * customer can buy a hoodie and a bag of beans in a single order.
 */
export type ProductLineId = 'merch' | 'good_things_brewing';

export interface ProductLine {
  id: ProductLineId;
  name: string;
  tagline: string | null;
  description: string | null;
  sort_order: number;
  active: boolean;
}

export type ProductCategory =
  | 'apparel'
  | 'headwear'
  | 'drinkware'
  | 'accessories'
  | 'coffee'
  | 'matcha'
  | 'equipment';

export interface Product {
  id: string;
  title: string;
  description: string | null;
  /** Legacy boolean, derived from `status` by trigger. Do not write directly. */
  active: boolean;
  status: ProductStatus;
  slug: string;
  product_line: ProductLineId;
  category: ProductCategory | null;
  /**
   * Stripe Tax product tax code. Null falls back to general tangible goods,
   * which is correct for merch. Packaged coffee and matcha are food and are
   * taxed differently in California.
   */
  tax_code: string | null;
  seo_title: string | null;
  seo_description: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  title: string;
  sku: string;
  price_cents: number;
  /** Strikethrough "was" price. Null when not on sale. */
  compare_at_price_cents: number | null;
  currency: string;
  inventory_qty: number;
  low_stock_threshold: number;
  active: boolean;
  sort_order: number;
  /** Shipping weight incl. packaging. Null falls back to shop settings. */
  weight_oz: number | null;
  length_in: number | null;
  width_in: number | null;
  height_in: number | null;
  created_at: string;
  updated_at: string;
}

export interface ProductImage {
  id: string;
  product_id: string;
  image_path: string;
  /** Resolved public URL. */
  image_url: string;
  alt_text: string | null;
  sort_order: number;
  created_at: string;
}

export interface ProductWithDetails extends Product {
  variants: ProductVariant[];
  images: ProductImage[];
}

// ---------------------------------------------------------------------------
// Cart
// ---------------------------------------------------------------------------

export interface CartItem {
  productId: string;
  variantId: string;
  qty: number;
  /** Client-side only; the server always re-reads the true price. */
  unitPriceCents: number;
  imageUrl: string;
  title: string;
  variantTitle: string;
  sku: string;
  slug: string;
}

// ---------------------------------------------------------------------------
// Checkout
// ---------------------------------------------------------------------------

export interface ShippingAddress {
  name: string;
  email: string;
  phone?: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

export interface ShippingRate {
  object_id: string;
  amount: string;
  amount_cents: number;
  currency: string;
  provider: string;
  provider_image_url?: string;
  servicelevel: {
    name: string;
    token: string;
  };
  estimated_days?: number;
  duration_terms?: string;
}

/**
 * Server-computed order total. The client never calculates money it will be
 * charged — this comes back from `shop_quote` and is recomputed again inside
 * `shop_create_payment_intent` before the PaymentIntent is created.
 */
/** A cart line as priced by the server. Client prices are never used. */
export interface QuotedItem {
  productId: string;
  variantId: string;
  title: string;
  variantTitle: string;
  sku: string;
  qty: number;
  unitPriceCents: number;
  lineTotalCents: number;
}

export interface Quote {
  items: QuotedItem[];
  subtotal_cents: number;
  discount_cents: number;
  discount_code: string | null;
  /** Why a submitted code was rejected. Null when none was submitted or it was valid. */
  discount_error: string | null;
  shipping_cents: number;
  tax_cents: number;
  /**
   * Whether Stripe Tax actually answered. Distinguishes "genuinely $0 tax"
   * from "tax could not be calculated" — both show tax_cents: 0.
   */
  tax_available: boolean;
  total_cents: number;
  currency: string;
  /** True when the post-discount subtotal cleared the free-shipping threshold. */
  free_shipping_applied: boolean;
  /** Cents still needed to unlock free shipping; 0 once unlocked. */
  free_shipping_remaining_cents: number;
  free_shipping_threshold_cents: number;
  rates: ShippingRate[];
  /** The rate the server priced this quote against. Null without an address. */
  selected_rate: ShippingRate | null;
  shipment_id: string | null;
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

/**
 * `paid` is the fulfillment queue: payment cleared, nobody has packed it yet.
 * Labels are bought by an admin action, not automatically, so `paid` means
 * "needs packing" and `label_purchased` means "boxed, awaiting carrier".
 */
export type OrderStatus =
  | 'created'
  | 'paid'
  | 'payment_failed'
  | 'fulfillment_pending'
  | 'label_purchased'
  | 'label_failed'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded'
  | 'partially_refunded';

export type OrderChannel = 'app' | 'web';

export interface Order {
  id: string;
  order_number: number;
  channel: OrderChannel;
  /** Null for guest orders. */
  user_id: string | null;
  /** Lets a guest track their order without an account. Never expose publicly. */
  guest_token: string | null;
  status: OrderStatus;

  subtotal_cents: number;
  discount_cents: number;
  discount_code: string | null;
  shipping_cents: number;
  tax_cents: number;
  total_cents: number;
  refunded_cents: number;
  currency: string;
  free_shipping_applied: boolean;

  stripe_payment_intent_id: string | null;
  stripe_tax_calculation_id: string | null;

  shippo_shipment_id: string | null;
  shippo_rate_id: string | null;
  shippo_transaction_id: string | null;
  shippo_label_url: string | null;
  tracking_number: string | null;
  tracking_url_provider: string | null;
  label_error: string | null;
  parcel_used: ParcelDimensions | null;

  shipping_name: string;
  shipping_email: string;
  shipping_phone: string | null;
  shipping_address1: string;
  shipping_address2: string | null;
  shipping_city: string;
  shipping_state: string;
  shipping_zip: string;
  shipping_country: string;

  paid_at: string | null;
  label_purchased_at: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
  refunded_at: string | null;
  inventory_decremented_at: string | null;
  receipt_email_sent_at: string | null;
  fulfillment_email_sent_at: string | null;
  shipment_confirmation_email_sent_at: string | null;

  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  variant_id: string;
  title: string;
  variant_title: string;
  sku: string;
  qty: number;
  unit_price_cents: number;
  line_total_cents: number;
  created_at: string;
}

export interface OrderWithItems extends Order {
  items: OrderItem[];
}

export type OrderEventType =
  | 'payment_succeeded'
  | 'payment_failed'
  | 'label_purchased'
  | 'label_failed'
  | 'marked_shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded'
  | 'note_added';

export interface OrderEvent {
  id: string;
  order_id: string;
  type: OrderEventType;
  payload: Record<string, unknown> | null;
  created_at: string;
}

export interface ParcelDimensions {
  length_in: number;
  width_in: number;
  height_in: number;
  weight_oz: number;
}

// ---------------------------------------------------------------------------
// Shop settings & discounts
// ---------------------------------------------------------------------------

export interface ShopSettings {
  free_shipping_threshold_cents: number;
  default_item_weight_oz: number;
  default_box_length_in: number;
  default_box_width_in: number;
  default_box_height_in: number;
  ship_from_name: string;
  ship_from_street1: string;
  ship_from_street2: string | null;
  ship_from_city: string;
  ship_from_state: string;
  ship_from_zip: string;
  ship_from_country: string;
  ship_from_phone: string | null;
  ship_from_email: string | null;
  store_accepting_orders: boolean;
  announcement_banner: string | null;
  updated_at: string;
}

export interface DiscountCode {
  id: string;
  code: string;
  kind: 'percent' | 'fixed';
  /** Percentage points when kind is 'percent', cents when 'fixed'. */
  value: number;
  min_subtotal_cents: number;
  free_shipping: boolean;
  starts_at: string | null;
  ends_at: string | null;
  max_redemptions: number | null;
  times_redeemed: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

export interface AdminOrderSummary {
  id: string;
  order_number: number;
  channel: OrderChannel;
  status: OrderStatus;
  created_at: string;
  paid_at: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  shipping_name: string;
  shipping_email: string;
  shipping_city: string;
  shipping_state: string;
  subtotal_cents: number;
  shipping_cents: number;
  tax_cents: number;
  discount_cents: number;
  refunded_cents: number;
  total_cents: number;
  tracking_number: string | null;
  shippo_label_url: string | null;
  label_error: string | null;
  item_count: number;
  is_guest: boolean;
}

export interface InventoryAdjustment {
  id: string;
  variant_id: string;
  delta: number;
  qty_after: number;
  reason: string;
  order_id: string | null;
  actor_id: string | null;
  note: string | null;
  created_at: string;
}

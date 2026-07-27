/**
 * Money helpers.
 *
 * Every monetary value in this system is an integer number of cents. Nothing
 * anywhere should hold a float dollar amount — Shippo is the one exception,
 * since its API returns `amount` as a decimal string, and it is converted at
 * the boundary.
 */

export function formatPrice(cents: number, currency = 'usd'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

/** Convert a Shippo decimal-string amount (e.g. "8.45") to cents. */
export function shippoAmountToCents(amount: string): number {
  return Math.round(parseFloat(amount) * 100);
}

export function sumLineItems(
  items: Array<{ unitPriceCents: number; qty: number }>
): number {
  return items.reduce((sum, i) => sum + i.unitPriceCents * i.qty, 0);
}

/**
 * Apply a discount to a subtotal.
 *
 * Percent discounts round half-up, and the result is clamped so a discount can
 * never exceed the subtotal or produce a negative charge.
 */
export function applyDiscount(
  subtotalCents: number,
  kind: 'percent' | 'fixed',
  value: number
): number {
  const raw =
    kind === 'percent'
      ? Math.round((subtotalCents * value) / 100)
      : value;
  return Math.min(Math.max(raw, 0), subtotalCents);
}

/** Cents remaining before free shipping unlocks. Zero once cleared. */
export function freeShippingRemaining(
  subtotalCents: number,
  thresholdCents: number
): number {
  return Math.max(0, thresholdCents - subtotalCents);
}

export function qualifiesForFreeShipping(
  subtotalCents: number,
  thresholdCents: number
): boolean {
  return subtotalCents >= thresholdCents;
}

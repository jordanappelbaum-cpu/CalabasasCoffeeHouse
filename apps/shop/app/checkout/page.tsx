'use client';

/**
 * Guest checkout, two steps:
 *
 *   1. Details — address, shipping method, discount code. Totals are quoted by
 *      the server on every meaningful change.
 *   2. Payment — Stripe Payment Element against a PaymentIntent whose amount
 *      was computed server-side from the database, not from anything here.
 *
 * Nothing on this page determines what the customer is charged. The amount is
 * recomputed inside shop_create_payment_intent immediately before the intent
 * is created.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { formatPrice } from '@cch/shared';
import type { Quote, ShippingAddress } from '@cch/shared';
import { useCart } from '@/lib/cart';
import { getQuote, createPaymentIntent, ApiError } from '@/lib/api';
import { PaymentStep } from '@/components/PaymentStep';
import { AddressForm, EMPTY_ADDRESS, isAddressComplete } from '@/components/AddressForm';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export default function CheckoutPage() {
  const { items, subtotalCents, ready } = useCart();

  const [address, setAddress] = useState<ShippingAddress>(EMPTY_ADDRESS);
  const [discountInput, setDiscountInput] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<string | null>(null);
  const [rateId, setRateId] = useState<string | null>(null);

  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [intent, setIntent] = useState<{
    clientSecret: string;
    orderNumber: number;
    guestToken: string;
  } | null>(null);
  const [starting, setStarting] = useState(false);

  const cartLines = items.map((i) => ({ variantId: i.variantId, qty: i.qty }));
  const addressReady = isAddressComplete(address);

  // Guards against an older, slower quote landing after a newer one.
  const requestSeq = useRef(0);

  const refreshQuote = useCallback(async () => {
    if (items.length === 0) return;
    const seq = ++requestSeq.current;
    setQuoting(true);
    setError(null);
    try {
      const q = await getQuote({
        items: cartLines,
        address: addressReady ? address : null,
        discount_code: appliedDiscount,
        rate_id: rateId,
      });
      if (seq !== requestSeq.current) return;
      setQuote(q);
      // Adopt the server's choice when we had none, or when ours vanished.
      if (q.selected_rate && q.selected_rate.object_id !== rateId) setRateId(q.selected_rate.object_id);
    } catch (e) {
      if (seq !== requestSeq.current) return;
      setError(e instanceof ApiError ? e.message : 'Could not calculate your total');
      setQuote(null);
    } finally {
      if (seq === requestSeq.current) setQuoting(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(cartLines), addressReady, address, appliedDiscount, rateId]);

  useEffect(() => {
    if (!ready) return;
    // Debounced so typing a ZIP does not fire a Shippo call per keystroke.
    const t = setTimeout(refreshQuote, 400);
    return () => clearTimeout(t);
  }, [ready, refreshQuote]);

  async function startPayment() {
    if (!quote || !rateId || !addressReady) return;
    setStarting(true);
    setError(null);
    try {
      const res = await createPaymentIntent({
        items: cartLines,
        shipping_address: address,
        rate_id: rateId,
        discount_code: appliedDiscount,
      });
      setIntent({
        clientSecret: res.client_secret,
        orderNumber: res.order_number,
        guestToken: res.guest_token,
      });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not start payment');
    } finally {
      setStarting(false);
    }
  }

  if (!ready) {
    return <div className="mx-auto max-w-3xl px-4 py-20 text-center text-ink-soft">Loading…</div>;
  }

  if (items.length === 0 && !intent) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h1 className="font-display text-3xl font-semibold text-cch-blue">Your cart is empty</h1>
        <Link href="/" className="btn-primary mt-8">
          Browse the shop
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="font-display text-3xl font-semibold text-cch-blue">Checkout</h1>
      <p className="mt-2 text-sm text-ink-soft">
        No account needed. We&apos;ll email your receipt and tracking.
      </p>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_22rem]">
        <div>
          {intent ? (
            <Elements
              stripe={stripePromise}
              options={{
                clientSecret: intent.clientSecret,
                appearance: {
                  theme: 'flat',
                  variables: {
                    colorPrimary: '#455766',
                    colorBackground: '#ffffff',
                    borderRadius: '8px',
                    fontFamily: 'system-ui, sans-serif',
                  },
                },
              }}
            >
              <PaymentStep
                orderNumber={intent.orderNumber}
                guestToken={intent.guestToken}
                totalCents={quote?.total_cents ?? 0}
                email={address.email}
                onBack={() => setIntent(null)}
              />
            </Elements>
          ) : (
            <>
              <AddressForm value={address} onChange={setAddress} />

              {/* Shipping method */}
              <section className="mt-10">
                <h2 className="font-display text-xl font-semibold text-cch-blue">Shipping</h2>

                {!addressReady ? (
                  <p className="mt-3 text-sm text-ink-soft">
                    Enter your address above to see shipping options.
                  </p>
                ) : quoting && !quote?.rates.length ? (
                  <p className="mt-3 text-sm text-ink-soft">Finding shipping rates…</p>
                ) : quote?.rates.length ? (
                  <ul className="mt-3 space-y-2">
                    {quote.rates.slice(0, 6).map((rate) => (
                      <li key={rate.object_id}>
                        <label
                          className={`flex cursor-pointer items-center gap-3 rounded-lg border bg-white p-3.5 transition ${
                            rateId === rate.object_id
                              ? 'border-cch-blue ring-1 ring-cch-blue'
                              : 'border-line hover:border-cch-blue/50'
                          }`}
                        >
                          <input
                            type="radio"
                            name="rate"
                            value={rate.object_id}
                            checked={rateId === rate.object_id}
                            onChange={() => setRateId(rate.object_id)}
                            className="accent-cch-blue"
                          />
                          <span className="flex-1 text-sm">
                            <span className="font-medium text-ink">
                              {rate.provider} {rate.servicelevel.name}
                            </span>
                            {rate.estimated_days != null && (
                              <span className="block text-ink-soft">
                                {rate.estimated_days} business day
                                {rate.estimated_days === 1 ? '' : 's'}
                              </span>
                            )}
                          </span>
                          <span className="text-sm tabular-nums text-ink">
                            {quote.free_shipping_applied ? (
                              <span className="font-medium text-cch-blue">Free</span>
                            ) : (
                              formatPrice(rate.amount_cents)
                            )}
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-ink-soft">
                    {error ?? 'No shipping options for that address yet.'}
                  </p>
                )}
              </section>

              {error && (
                <p role="alert" className="mt-6 rounded-lg bg-white p-4 text-sm text-ink ring-1 ring-red-300">
                  {error}
                </p>
              )}

              <button
                type="button"
                onClick={startPayment}
                disabled={!quote || !rateId || !addressReady || quoting || starting}
                className="btn-primary mt-8 w-full"
              >
                {starting ? 'Starting…' : 'Continue to payment'}
              </button>
            </>
          )}
        </div>

        {/* Summary */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-xl border border-line/70 bg-white p-5">
            <h2 className="font-medium text-ink">Order summary</h2>

            <ul className="mt-4 space-y-3 text-sm">
              {items.map((i) => (
                <li key={i.variantId} className="flex justify-between gap-3">
                  <span className="text-ink-soft">
                    {i.title}
                    {i.variantTitle !== 'OS' && ` · ${i.variantTitle}`}
                    <span className="text-ink-faint"> × {i.qty}</span>
                  </span>
                  <span className="tabular-nums text-ink">
                    {formatPrice(i.unitPriceCents * i.qty)}
                  </span>
                </li>
              ))}
            </ul>

            {/* Discount */}
            {!intent && (
              <div className="mt-5 border-t border-line/70 pt-4">
                <label htmlFor="discount" className="label">
                  Discount code
                </label>
                <div className="flex gap-2">
                  <input
                    id="discount"
                    value={discountInput}
                    onChange={(e) => setDiscountInput(e.target.value)}
                    className="field"
                    placeholder="Enter code"
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    onClick={() => setAppliedDiscount(discountInput.trim() || null)}
                    className="btn-secondary shrink-0 px-4 py-2.5"
                  >
                    Apply
                  </button>
                </div>
                {quote?.discount_error && (
                  <p className="mt-2 text-sm text-red-600">{quote.discount_error}</p>
                )}
                {quote?.discount_code && (
                  <p className="mt-2 text-sm text-cch-blue">
                    {quote.discount_code} applied
                  </p>
                )}
              </div>
            )}

            <dl className="mt-5 space-y-2 border-t border-line/70 pt-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-soft">Subtotal</dt>
                <dd className="tabular-nums">
                  {formatPrice(quote?.subtotal_cents ?? subtotalCents)}
                </dd>
              </div>
              {!!quote?.discount_cents && (
                <div className="flex justify-between text-cch-blue">
                  <dt>Discount</dt>
                  <dd className="tabular-nums">−{formatPrice(quote.discount_cents)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-ink-soft">Shipping</dt>
                <dd className="tabular-nums">
                  {!addressReady
                    ? '—'
                    : quote?.free_shipping_applied
                      ? 'Free'
                      : formatPrice(quote?.shipping_cents ?? 0)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-soft">Tax</dt>
                <dd className="tabular-nums">
                  {addressReady ? formatPrice(quote?.tax_cents ?? 0) : '—'}
                </dd>
              </div>
              <div className="flex justify-between border-t border-line/70 pt-3 text-base font-semibold">
                <dt>Total</dt>
                <dd className="tabular-nums">
                  {formatPrice(quote?.total_cents ?? subtotalCents)}
                </dd>
              </div>
            </dl>

            {quoting && <p className="mt-3 text-xs text-ink-faint">Updating…</p>}
          </div>
        </aside>
      </div>
    </div>
  );
}

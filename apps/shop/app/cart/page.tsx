'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { formatPrice } from '@cch/shared';
import { useCart } from '@/lib/cart';
import { getQuote, ApiError } from '@/lib/api';

export default function CartPage() {
  const { items, setQty, remove, subtotalCents, ready } = useCart();

  // Free-shipping progress comes from the server so the threshold lives in one
  // place (shop_settings) rather than being duplicated in the UI.
  const [threshold, setThreshold] = useState<number | null>(null);
  const [issue, setIssue] = useState<string | null>(null);

  useEffect(() => {
    if (!ready || items.length === 0) return;
    let cancelled = false;

    // No address yet, so this returns cart totals and the threshold only —
    // it does not attempt shipping rates.
    getQuote({ items: items.map((i) => ({ variantId: i.variantId, qty: i.qty })) })
      .then((q) => {
        if (cancelled) return;
        setThreshold(q.free_shipping_threshold_cents);
        setIssue(null);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        // Surfaces "only 2 left" or "no longer available" before checkout,
        // rather than letting someone hit a wall at the payment step.
        if (e instanceof ApiError) setIssue(e.message);
      });

    return () => {
      cancelled = true;
    };
  }, [items, ready]);

  if (!ready) {
    return <div className="mx-auto max-w-3xl px-4 py-20 text-center text-ink-soft">Loading…</div>;
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h1 className="font-display text-3xl font-semibold text-cch-blue">Your cart is empty</h1>
        <p className="mt-3 text-ink-soft">Nothing in here yet.</p>
        <Link href="/" className="btn-primary mt-8">
          Browse the shop
        </Link>
      </div>
    );
  }

  const remaining = threshold !== null ? Math.max(0, threshold - subtotalCents) : null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-display text-3xl font-semibold text-cch-blue">Your cart</h1>

      {issue && (
        <p role="alert" className="mt-5 rounded-lg bg-white p-4 text-sm text-ink ring-1 ring-cch-blue/30">
          {issue}
        </p>
      )}

      {remaining !== null && (
        <div className="mt-6 rounded-xl border border-cch-blue/20 bg-white p-4">
          {remaining > 0 ? (
            <>
              <p className="text-sm text-ink">
                You&apos;re {formatPrice(remaining)} away from free shipping.
              </p>
              <div
                className="mt-2 h-1.5 overflow-hidden rounded-full bg-cch-cream"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={threshold!}
                aria-valuenow={subtotalCents}
              >
                <div
                  className="h-full rounded-full bg-cch-blue transition-all"
                  style={{ width: `${Math.min(100, (subtotalCents / threshold!) * 100)}%` }}
                />
              </div>
            </>
          ) : (
            <p className="text-sm font-medium text-cch-blue">✦ You&apos;ve got free shipping</p>
          )}
        </div>
      )}

      <ul className="mt-8 divide-y divide-line/70">
        {items.map((item) => (
          <li key={item.variantId} className="flex gap-4 py-5">
            <Link
              href={`/products/${item.slug}`}
              className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-white ring-1 ring-line/60"
            >
              {item.imageUrl && (
                <Image src={item.imageUrl} alt="" fill sizes="96px" className="object-cover" />
              )}
            </Link>

            <div className="flex flex-1 flex-col justify-between">
              <div className="flex justify-between gap-4">
                <div>
                  <Link
                    href={`/products/${item.slug}`}
                    className="font-medium text-ink hover:text-cch-blue"
                  >
                    {item.title}
                  </Link>
                  {item.variantTitle !== 'OS' && (
                    <p className="text-sm text-ink-soft">{item.variantTitle}</p>
                  )}
                </div>
                <p className="tabular-nums text-ink">
                  {formatPrice(item.unitPriceCents * item.qty)}
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div className="inline-flex items-center rounded-lg border border-line bg-white">
                  <button
                    type="button"
                    onClick={() => setQty(item.variantId, item.qty - 1)}
                    className="px-3 py-1.5 text-ink-soft hover:text-cch-blue"
                    aria-label={`Decrease quantity of ${item.title}`}
                  >
                    −
                  </button>
                  <span className="min-w-8 text-center text-sm tabular-nums" aria-live="polite">
                    {item.qty}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQty(item.variantId, item.qty + 1)}
                    className="px-3 py-1.5 text-ink-soft hover:text-cch-blue"
                    aria-label={`Increase quantity of ${item.title}`}
                  >
                    +
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => remove(item.variantId)}
                  className="text-sm text-ink-faint underline hover:text-cch-blue"
                >
                  Remove
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-8 border-t border-line/70 pt-6">
        <div className="flex justify-between text-lg font-medium">
          <span>Subtotal</span>
          <span className="tabular-nums">{formatPrice(subtotalCents)}</span>
        </div>
        <p className="mt-1 text-sm text-ink-soft">
          Shipping and tax calculated at checkout.
        </p>

        <Link href="/checkout" className="btn-primary mt-6 w-full">
          Checkout
        </Link>
        <Link href="/" className="mt-3 block text-center text-sm text-ink-soft hover:text-cch-blue">
          Continue shopping
        </Link>
      </div>
    </div>
  );
}

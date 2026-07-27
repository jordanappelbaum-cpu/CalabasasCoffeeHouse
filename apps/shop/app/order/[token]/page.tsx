'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { lookupOrder, type LookupResponse } from '@/lib/api';
import { OrderView } from '@/components/OrderView';
import { useCart } from '@/lib/cart';

/**
 * Post-checkout confirmation, reached via Stripe's return_url.
 *
 * The token in the URL is the order's guest_token — unguessable, and the only
 * credential a guest has for their own order.
 */
export default function OrderPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const { clear } = useCart();

  const [data, setData] = useState<LookupResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    // The webhook may not have marked the order paid yet when Stripe redirects,
    // so retry briefly before showing anything alarming.
    async function load(attempt = 0) {
      try {
        const res = await lookupOrder({ guest_token: token });
        if (cancelled) return;
        setData(res);
        // Only clear the cart once we can confirm the order exists.
        if (attempt === 0) clear();
        if (res.order.status === 'created' && attempt < 4) {
          setTimeout(() => load(attempt + 1), 1500);
        }
      } catch {
        if (cancelled) return;
        if (attempt < 4) setTimeout(() => load(attempt + 1), 1500);
        else setError("We couldn't find that order.");
      }
    }

    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (error) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <h1 className="font-display text-2xl font-semibold text-cch-blue">Order not found</h1>
        <p className="mt-3 text-ink-soft">{error}</p>
        <Link href="/track" className="btn-primary mt-8">Look up an order</Link>
      </div>
    );
  }

  if (!data) {
    return <div className="mx-auto max-w-2xl px-4 py-24 text-center text-ink-soft">Loading your order…</div>;
  }

  return <OrderView data={data} justPlaced />;
}

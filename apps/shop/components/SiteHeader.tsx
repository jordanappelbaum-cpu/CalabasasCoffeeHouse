'use client';

import Link from 'next/link';
import { useCart } from '@/lib/cart';

/**
 * The store lives on shop.calabasascoffeehouse.com while the cafe site stays
 * on Toast at the apex domain, so the nav links back out to it. Those are
 * absolute URLs on purpose — they leave this app.
 */
const CAFE = 'https://calabasascoffeehouse.com';

export function SiteHeader() {
  const { itemCount, ready } = useCart();

  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-cch-cream/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="font-display text-lg leading-none font-semibold tracking-tight text-cch-blue">
            Calabasas Coffee House
          </span>
          <span className="hidden text-[11px] uppercase tracking-[0.18em] text-ink-faint sm:inline">
            Shop
          </span>
        </Link>

        <nav className="flex items-center gap-1 text-sm sm:gap-4">
          <a
            href={`${CAFE}/order`}
            className="hidden rounded-full px-3 py-2 text-ink-soft hover:text-cch-blue sm:block"
          >
            Order coffee
          </a>
          <a
            href={CAFE}
            className="hidden rounded-full px-3 py-2 text-ink-soft hover:text-cch-blue sm:block"
          >
            Visit the cafe
          </a>
          <Link
            href="/track"
            className="rounded-full px-3 py-2 text-ink-soft hover:text-cch-blue"
          >
            Track order
          </Link>
          <Link
            href="/cart"
            className="relative rounded-full bg-cch-blue px-4 py-2 font-medium text-white hover:bg-cch-blue-dark"
            aria-label={`Cart${ready && itemCount ? `, ${itemCount} item${itemCount === 1 ? '' : 's'}` : ', empty'}`}
          >
            Cart
            {/* Rendered only after localStorage is read, so SSR and client agree. */}
            {ready && itemCount > 0 && (
              <span className="ml-1.5 rounded-full bg-white/25 px-1.5 py-0.5 text-xs tabular-nums">
                {itemCount}
              </span>
            )}
          </Link>
        </nav>
      </div>
    </header>
  );
}

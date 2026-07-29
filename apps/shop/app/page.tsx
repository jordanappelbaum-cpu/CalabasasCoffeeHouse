import Link from 'next/link';
import { getCatalog } from '@/lib/api';
import { LineTeaser, LINE_PATH } from '@/components/LineSection';
import { formatPrice } from '@cch/shared';
import type { ProductLine, ProductLineId } from '@cch/shared';

export const revalidate = 60;

/**
 * Landing page for the shop.
 *
 * Presents the two lines — CCH Merch and Good Things Brewing — as distinct
 * destinations while keeping a single cart underneath, so a customer can buy a
 * hoodie and a bag of beans in one order and pay one shipping charge.
 */
export default async function ShopHome() {
  const { products, lines, settings } = await getCatalog();
  const safeLines = lines ?? [];

  // Fall back to a single implicit line if migration 024 has not run yet, so
  // the storefront degrades to its previous behaviour rather than breaking.
  const effectiveLines: ProductLine[] =
    safeLines.length > 0
      ? safeLines
      : [
          {
            id: 'merch',
            name: 'The CCH Shop',
            tagline: null,
            description: null,
            sort_order: 0,
            active: true,
          },
        ];

  return (
    <>
      {settings?.announcement_banner && (
        <div className="bg-cch-blue px-4 py-2.5 text-center text-sm text-white">
          {settings.announcement_banner}
        </div>
      )}

      <section className="mx-auto max-w-6xl px-4 pb-2 pt-14 sm:pt-20">
        <h1 className="font-display text-4xl font-semibold tracking-tight text-cch-blue sm:text-5xl">
          Good things, boxed up
        </h1>
        <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-ink-soft">
          Everything we make, shipped from the shop on Park Sorrento in
          Calabasas. Wear it or brew it.
        </p>

        <div className="mt-7 flex flex-wrap gap-3">
          {effectiveLines.map((line) => (
            <Link
              key={line.id}
              href={LINE_PATH[line.id as ProductLineId] ?? '/merch'}
              className="btn-secondary"
            >
              {line.name}
            </Link>
          ))}
        </div>

        {settings && (
          <p className="mt-7 inline-flex items-center gap-2 rounded-full border border-cch-blue/20 bg-white px-4 py-2 text-sm text-cch-blue">
            <span aria-hidden>✦</span>
            Free shipping on orders over{' '}
            {formatPrice(settings.free_shipping_threshold_cents)} — mix and match
            across both
          </p>
        )}
      </section>

      {effectiveLines.map((line) => (
        <LineTeaser
          key={line.id}
          line={line}
          products={products.filter(
            (p) => (p.product_line ?? 'merch') === line.id
          )}
        />
      ))}

      {!settings?.store_accepting_orders && (
        <div
          role="status"
          className="mx-auto mb-16 max-w-6xl px-4 text-center text-sm text-ink-soft"
        >
          The shop is temporarily closed for new orders. Everything above is
          still here when we reopen.
        </div>
      )}
    </>
  );
}

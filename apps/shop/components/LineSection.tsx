import Link from 'next/link';
import { formatPrice } from '@cch/shared';
import type { ProductLine, ProductLineId } from '@cch/shared';
import type { CatalogProduct } from '@/lib/api';
import { ProductCard } from './ProductCard';

/** URL path for each line. Kept here so routes and links can never disagree. */
export const LINE_PATH: Record<ProductLineId, string> = {
  merch: '/merch',
  good_things_brewing: '/good-things-brewing',
};

export function LineHeader({
  line,
  freeShippingCents,
}: {
  line: ProductLine;
  freeShippingCents?: number;
}) {
  return (
    <section className="mx-auto max-w-6xl px-4 pb-2 pt-14 sm:pt-20">
      <h1 className="font-display text-4xl font-semibold tracking-tight text-cch-blue sm:text-5xl">
        {line.name}
      </h1>
      {line.tagline && (
        <p className="mt-2 text-lg text-cch-blue/70">{line.tagline}</p>
      )}
      {line.description && (
        <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-ink-soft">
          {line.description}
        </p>
      )}
      {freeShippingCents != null && (
        <p className="mt-6 inline-flex items-center gap-2 rounded-full border border-cch-blue/20 bg-white px-4 py-2 text-sm text-cch-blue">
          <span aria-hidden>✦</span>
          Free shipping on orders over {formatPrice(freeShippingCents)}
        </p>
      )}
    </section>
  );
}

export function ProductGrid({ products }: { products: CatalogProduct[] }) {
  // Coming-soon items sort last so purchasable stock leads.
  const sorted = [...products].sort((a, b) => {
    if (a.coming_soon !== b.coming_soon) return a.coming_soon ? 1 : -1;
    return a.sort_order - b.sort_order;
  });

  if (sorted.length === 0) {
    return (
      <p className="py-20 text-center text-ink-soft">
        Nothing here just yet — check back soon.
      </p>
    );
  }

  return (
    <ul className="grid grid-cols-2 gap-x-5 gap-y-9 sm:grid-cols-3 lg:grid-cols-4">
      {sorted.map((product) => (
        <li key={product.id}>
          <ProductCard product={product} />
        </li>
      ))}
    </ul>
  );
}

/**
 * A line teaser on the landing page: heading, a few products, and a link
 * through to the full line.
 */
export function LineTeaser({
  line,
  products,
}: {
  line: ProductLine;
  products: CatalogProduct[];
}) {
  const preview = [...products]
    .sort((a, b) => {
      if (a.coming_soon !== b.coming_soon) return a.coming_soon ? 1 : -1;
      return a.sort_order - b.sort_order;
    })
    .slice(0, 4);

  return (
    <section className="mx-auto max-w-6xl px-4 py-12">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-semibold tracking-tight text-cch-blue sm:text-3xl">
            {line.name}
          </h2>
          {line.tagline && (
            <p className="mt-1 text-[15px] text-ink-soft">{line.tagline}</p>
          )}
        </div>
        <Link
          href={LINE_PATH[line.id]}
          className="text-sm font-medium text-cch-blue underline underline-offset-4 hover:text-cch-blue-dark"
        >
          {products.length > preview.length
            ? `See all ${products.length}`
            : `Shop ${line.name}`}
        </Link>
      </div>

      <div className="mt-7">
        {preview.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line bg-white/50 px-6 py-12 text-center">
            <p className="font-medium text-cch-blue">Coming soon</p>
            <p className="mt-1 text-sm text-ink-soft">
              {line.description ?? 'This line is on its way.'}
            </p>
          </div>
        ) : (
          <ProductGrid products={preview} />
        )}
      </div>
    </section>
  );
}

import { getCatalog } from '@/lib/api';
import { ProductCard } from '@/components/ProductCard';
import { formatPrice } from '@cch/shared';

// Catalog changes rarely; the admin dashboard is the thing that changes it.
// 60s keeps stock and pricing edits visible quickly without hammering the DB.
export const revalidate = 60;

export default async function ShopPage() {
  const { products, settings } = await getCatalog();

  // Coming-soon items sort last so purchasable stock leads.
  const sorted = [...products].sort((a, b) => {
    if (a.coming_soon !== b.coming_soon) return a.coming_soon ? 1 : -1;
    return a.sort_order - b.sort_order;
  });

  return (
    <>
      {settings?.announcement_banner && (
        <div className="bg-cch-blue px-4 py-2.5 text-center text-sm text-white">
          {settings.announcement_banner}
        </div>
      )}

      <section className="mx-auto max-w-6xl px-4 pb-4 pt-14 sm:pt-20">
        <h1 className="font-display text-4xl font-semibold tracking-tight text-cch-blue sm:text-5xl">
          The CCH Shop
        </h1>
        <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-ink-soft">
          Hats, hoodies and everyday things from our corner of Calabasas.
          Packed and shipped by us, from the shop on Park Sorrento.
        </p>

        {settings && (
          <p className="mt-6 inline-flex items-center gap-2 rounded-full border border-cch-blue/20 bg-white px-4 py-2 text-sm text-cch-blue">
            <span aria-hidden>✦</span>
            Free shipping on orders over{' '}
            {formatPrice(settings.free_shipping_threshold_cents)}
          </p>
        )}
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 pt-8">
        {sorted.length === 0 ? (
          <p className="py-20 text-center text-ink-soft">
            Nothing in the shop right now — check back soon.
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-x-5 gap-y-9 sm:grid-cols-3 lg:grid-cols-4">
            {sorted.map((product) => (
              <li key={product.id}>
                <ProductCard product={product} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {!settings?.store_accepting_orders && (
        <div
          role="status"
          className="mx-auto mb-16 max-w-6xl px-4 text-center text-sm text-ink-soft"
        >
          The shop is temporarily closed for new orders. Everything above is still
          here when we reopen.
        </div>
      )}
    </>
  );
}

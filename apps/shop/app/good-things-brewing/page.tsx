import type { Metadata } from 'next';
import { getCatalog } from '@/lib/api';
import { LineHeader, ProductGrid } from '@/components/LineSection';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Good Things Brewing',
  description:
    'CCH coffee and matcha, bagged for your kitchen. From Calabasas Coffee House.',
  alternates: { canonical: '/good-things-brewing' },
};

export default async function GoodThingsBrewingPage() {
  const { products, lines, settings } = await getCatalog('good_things_brewing');
  const line = (lines ?? []).find((l) => l.id === 'good_things_brewing') ?? {
    id: 'good_things_brewing' as const,
    name: 'Good Things Brewing',
    tagline: 'The cafe, at home',
    description:
      'Our coffee and matcha, bagged for your kitchen. Roasted and blended to our specification by people who do it better than we could.',
    sort_order: 1,
    active: true,
  };

  return (
    <>
      <LineHeader line={line} freeShippingCents={settings?.free_shipping_threshold_cents} />
      <section className="mx-auto max-w-6xl px-4 pb-16 pt-8">
        {products.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line bg-white/60 px-6 py-20 text-center">
            <p className="font-display text-2xl font-semibold text-cch-blue">
              Almost ready
            </p>
            <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-ink-soft">
              We&apos;re getting our coffee and matcha bagged up for you. Follow{' '}
              <a
                href="https://www.instagram.com/calabasascoffeehouse/"
                className="underline hover:text-cch-blue"
                target="_blank"
                rel="noopener noreferrer"
              >
                @calabasascoffeehouse
              </a>{' '}
              and we&apos;ll announce it there first.
            </p>
          </div>
        ) : (
          <ProductGrid products={products} />
        )}
      </section>
    </>
  );
}

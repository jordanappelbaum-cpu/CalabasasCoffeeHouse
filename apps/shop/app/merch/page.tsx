import type { Metadata } from 'next';
import { getCatalog } from '@/lib/api';
import { LineHeader, ProductGrid } from '@/components/LineSection';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'CCH Merch',
  description:
    'Hats, hoodies, tees and everyday things from Calabasas Coffee House. Shipped from Calabasas, California.',
  alternates: { canonical: '/merch' },
};

export default async function MerchPage() {
  const { products, lines, settings } = await getCatalog('merch');
  const line = (lines ?? []).find((l) => l.id === 'merch') ?? {
    id: 'merch' as const,
    name: 'CCH Merch',
    tagline: 'Wear the neighbourhood',
    description: 'Hats, hoodies and everyday things from our corner of Calabasas.',
    sort_order: 0,
    active: true,
  };

  return (
    <>
      <LineHeader line={line} freeShippingCents={settings?.free_shipping_threshold_cents} />
      <section className="mx-auto max-w-6xl px-4 pb-16 pt-8">
        <ProductGrid products={products} />
      </section>
    </>
  );
}

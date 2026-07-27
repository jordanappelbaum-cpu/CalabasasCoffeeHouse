import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getProduct } from '@/lib/api';
import { ProductDetail } from '@/components/ProductDetail';
import { formatPrice } from '@cch/shared';

export const revalidate = 60;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { product } = await getProduct(slug).catch(() => ({ product: null }));
  if (!product) return { title: 'Not found' };

  const image = product.images[0]?.image_url;
  const description =
    product.seo_description ??
    product.description ??
    `${product.title} from Calabasas Coffee House.`;

  return {
    title: product.seo_title ?? product.title,
    description,
    openGraph: {
      title: product.seo_title ?? product.title,
      description,
      // Public bucket URLs, so these previews keep working. Signed URLs would
      // have expired an hour after render.
      images: image ? [{ url: image }] : undefined,
      type: 'website',
    },
    alternates: { canonical: `/products/${product.slug}` },
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const { product } = await getProduct(slug).catch(() => ({ product: null }));
  if (!product) notFound();

  const price = product.from_price_cents;

  return (
    <>
      <ProductDetail product={product} />

      {/* Rich result markup so the product can show price and availability in search. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: product.title,
            description: product.description ?? undefined,
            image: product.images.map((i) => i.image_url),
            brand: { '@type': 'Brand', name: 'Calabasas Coffee House' },
            offers: {
              '@type': 'AggregateOffer',
              priceCurrency: 'USD',
              lowPrice: price !== null ? (price / 100).toFixed(2) : undefined,
              availability: product.in_stock
                ? 'https://schema.org/InStock'
                : product.coming_soon
                  ? 'https://schema.org/PreOrder'
                  : 'https://schema.org/OutOfStock',
            },
          }),
        }}
      />
      <span className="sr-only">
        {price !== null ? formatPrice(price) : ''}
      </span>
    </>
  );
}

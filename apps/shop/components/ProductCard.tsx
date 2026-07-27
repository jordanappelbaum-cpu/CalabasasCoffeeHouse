import Image from 'next/image';
import Link from 'next/link';
import { formatPrice } from '@cch/shared';
import type { CatalogProduct } from '@/lib/api';

export function ProductCard({ product }: { product: CatalogProduct }) {
  const image = product.images[0];
  const soldOut = !product.coming_soon && !product.in_stock;

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group block focus:outline-none"
    >
      <div className="relative aspect-square overflow-hidden rounded-xl bg-white ring-1 ring-line/60 transition group-hover:ring-cch-blue/40 group-focus-visible:ring-2 group-focus-visible:ring-cch-blue">
        {image ? (
          <Image
            src={image.image_url}
            alt={image.alt_text ?? product.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-ink-faint">
            No photo yet
          </div>
        )}

        {product.coming_soon && (
          <span className="absolute left-3 top-3 rounded-full bg-cch-blue px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">
            Coming soon
          </span>
        )}
        {soldOut && (
          <span className="absolute left-3 top-3 rounded-full bg-ink/75 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">
            Sold out
          </span>
        )}
      </div>

      <div className="mt-3">
        <h3 className="text-[15px] font-medium leading-snug text-ink group-hover:text-cch-blue">
          {product.title}
        </h3>
        <p className="mt-0.5 text-sm text-ink-soft tabular-nums">
          {product.coming_soon
            ? 'Coming soon'
            : product.from_price_cents !== null
              ? // "From" only when variants differ in price.
                product.variants.length > 1 &&
                new Set(product.variants.map((v) => v.price_cents)).size > 1
                ? `From ${formatPrice(product.from_price_cents)}`
                : formatPrice(product.from_price_cents)
              : ''}
        </p>
      </div>
    </Link>
  );
}

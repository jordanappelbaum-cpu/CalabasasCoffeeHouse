'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatPrice } from '@cch/shared';
import type { CatalogProduct } from '@/lib/api';
import { useCart } from '@/lib/cart';

export function ProductDetail({ product }: { product: CatalogProduct }) {
  const router = useRouter();
  const { add } = useCart();

  // Default to the first variant that is actually in stock, so someone landing
  // on a hoodie page is not staring at a sold-out size.
  const firstAvailable = product.variants.find((v) => v.inventory_qty > 0);
  const [variantId, setVariantId] = useState(
    firstAvailable?.id ?? product.variants[0]?.id ?? ''
  );
  const [imageIndex, setImageIndex] = useState(0);
  const [added, setAdded] = useState(false);

  const variant = product.variants.find((v) => v.id === variantId);
  const image = product.images[imageIndex];
  const hasSizes = product.variants.length > 1;
  const outOfStock = !variant || variant.inventory_qty <= 0;
  const lowStock =
    variant && variant.inventory_qty > 0 && variant.inventory_qty <= variant.low_stock_threshold;

  function addToCart(goToCart: boolean) {
    if (!variant || outOfStock) return;
    add({
      productId: product.id,
      variantId: variant.id,
      qty: 1,
      unitPriceCents: variant.price_cents,
      imageUrl: product.images[0]?.image_url ?? '',
      title: product.title,
      variantTitle: variant.title,
      sku: variant.sku,
      slug: product.slug,
    });
    if (goToCart) router.push('/cart');
    else {
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-ink-soft">
        <Link href="/" className="hover:text-cch-blue">
          Shop
        </Link>
        <span className="mx-2 text-ink-faint" aria-hidden>
          /
        </span>
        <span className="text-ink">{product.title}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2">
        {/* Gallery */}
        <div>
          <div className="relative aspect-square overflow-hidden rounded-2xl bg-white ring-1 ring-line/60">
            {image ? (
              <Image
                src={image.image_url}
                alt={image.alt_text ?? product.title}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-ink-faint">
                No photo yet
              </div>
            )}
          </div>

          {product.images.length > 1 && (
            <ul className="mt-3 flex gap-3">
              {product.images.map((img, i) => (
                <li key={img.id}>
                  <button
                    type="button"
                    onClick={() => setImageIndex(i)}
                    aria-label={`View image ${i + 1} of ${product.images.length}`}
                    aria-current={i === imageIndex}
                    className={`relative h-16 w-16 overflow-hidden rounded-lg ring-1 transition ${
                      i === imageIndex
                        ? 'ring-2 ring-cch-blue'
                        : 'ring-line/60 hover:ring-cch-blue/50'
                    }`}
                  >
                    <Image
                      src={img.image_url}
                      alt=""
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Buy box */}
        <div className="lg:pt-4">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-cch-blue sm:text-4xl">
            {product.title}
          </h1>

          {variant && (
            <p className="mt-3 flex items-baseline gap-3 text-2xl tabular-nums text-ink">
              {formatPrice(variant.price_cents)}
              {variant.compare_at_price_cents && (
                <span className="text-base text-ink-faint line-through">
                  {formatPrice(variant.compare_at_price_cents)}
                </span>
              )}
            </p>
          )}

          {product.description && (
            <p className="mt-5 whitespace-pre-line text-[15px] leading-relaxed text-ink-soft">
              {product.description}
            </p>
          )}

          {product.coming_soon ? (
            <div className="mt-8 rounded-xl border border-cch-blue/20 bg-white p-5">
              <p className="font-medium text-cch-blue">Coming soon</p>
              <p className="mt-1 text-sm text-ink-soft">
                This one isn&apos;t ready to ship yet. Follow us on{' '}
                <a
                  href="https://www.instagram.com/calabasascoffeehouse/"
                  className="underline hover:text-cch-blue"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Instagram
                </a>{' '}
                and we&apos;ll announce it there first.
              </p>
            </div>
          ) : (
            <>
              {hasSizes && (
                <fieldset className="mt-8">
                  <legend className="label">Size</legend>
                  <div className="flex flex-wrap gap-2">
                    {product.variants.map((v) => {
                      const gone = v.inventory_qty <= 0;
                      return (
                        <button
                          key={v.id}
                          type="button"
                          disabled={gone}
                          onClick={() => setVariantId(v.id)}
                          aria-pressed={v.id === variantId}
                          className={`min-w-[3.5rem] rounded-lg border px-4 py-2.5 text-sm font-medium transition ${
                            v.id === variantId
                              ? 'border-cch-blue bg-cch-blue text-white'
                              : gone
                                ? 'cursor-not-allowed border-line bg-transparent text-ink-faint line-through'
                                : 'border-line bg-white text-ink hover:border-cch-blue'
                          }`}
                        >
                          {v.title}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
              )}

              {lowStock && (
                <p className="mt-4 text-sm font-medium text-cch-blue" role="status">
                  Only {variant!.inventory_qty} left
                </p>
              )}

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => addToCart(false)}
                  disabled={outOfStock}
                  className="btn-secondary flex-1"
                >
                  {outOfStock ? 'Sold out' : added ? 'Added ✓' : 'Add to cart'}
                </button>
                <button
                  type="button"
                  onClick={() => addToCart(true)}
                  disabled={outOfStock}
                  className="btn-primary flex-1"
                >
                  Buy now
                </button>
              </div>

              <dl className="mt-8 space-y-2 border-t border-line/70 pt-6 text-sm text-ink-soft">
                <div className="flex gap-2">
                  <dt className="font-medium text-ink">Ships from</dt>
                  <dd>Calabasas, California</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="font-medium text-ink">Shipping</dt>
                  <dd>Calculated at checkout, free over $75</dd>
                </div>
                {variant && (
                  <div className="flex gap-2">
                    <dt className="font-medium text-ink">SKU</dt>
                    <dd className="tabular-nums">{variant.sku}</dd>
                  </div>
                )}
              </dl>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

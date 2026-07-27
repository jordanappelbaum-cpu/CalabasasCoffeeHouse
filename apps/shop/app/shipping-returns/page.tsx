import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Shipping & Returns',
  description: 'How Calabasas Coffee House ships orders and handles returns.',
};

export default function ShippingReturnsPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="font-display text-3xl font-semibold text-cch-blue">Shipping &amp; returns</h1>

      <div className="mt-8 space-y-8 text-[15px] leading-relaxed text-ink-soft">
        <section>
          <h2 className="font-medium text-ink">Shipping</h2>
          <p className="mt-2">
            Everything ships from our shop at 23500 Park Sorrento in Calabasas, California.
            Orders over $75 ship free. Below that, you&apos;ll see live carrier rates at
            checkout and can pick the speed you want.
          </p>
          <p className="mt-2">
            We pack orders by hand, usually within one to two business days. You&apos;ll get
            an email with tracking the moment your label is created.
          </p>
        </section>

        <section>
          <h2 className="font-medium text-ink">Returns</h2>
          <p className="mt-2">
            If something isn&apos;t right, email{' '}
            <a href="mailto:info@calabasascoffeehouse.com" className="underline hover:text-cch-blue">
              info@calabasascoffeehouse.com
            </a>{' '}
            within 30 days and we&apos;ll make it right. Unworn items in original condition
            can be returned for a refund.
          </p>
        </section>

        <section>
          <h2 className="font-medium text-ink">Where we ship</h2>
          <p className="mt-2">United States only for now.</p>
        </section>
      </div>
    </div>
  );
}

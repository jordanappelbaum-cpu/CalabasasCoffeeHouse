import { formatPrice } from '@cch/shared';
import type { LookupResponse } from '@/lib/api';

/**
 * Customer-facing order view, shared by the post-checkout confirmation and the
 * order tracking page.
 *
 * Statuses shown here come from the server's `status_label`, which smooths over
 * internal states — a customer should never see "label_failed", only that their
 * order is being prepared.
 */
export function OrderView({ data, justPlaced }: { data: LookupResponse; justPlaced?: boolean }) {
  const { order, items } = data;
  const shipped = Boolean(order.tracking_number);

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      {justPlaced && (
        <div className="mb-8 rounded-xl border border-cch-blue/20 bg-white p-6 text-center">
          <p className="font-display text-2xl font-semibold text-cch-blue">Thank you!</p>
          <p className="mt-2 text-sm text-ink-soft">
            Your order is confirmed. We&apos;ve emailed a receipt and we&apos;ll send
            tracking as soon as it ships.
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="font-display text-2xl font-semibold text-cch-blue">
          Order CCH-{order.order_number}
        </h1>
        <span className="rounded-full bg-cch-blue/10 px-3 py-1 text-sm font-medium text-cch-blue">
          {order.status_label}
        </span>
      </div>

      <p className="mt-1 text-sm text-ink-soft">
        Placed{' '}
        {new Date(order.created_at).toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        })}
      </p>

      {shipped && (
        <div className="mt-6 rounded-xl border border-line/70 bg-white p-5">
          <h2 className="font-medium text-ink">Tracking</h2>
          <p className="mt-1 font-mono text-sm text-ink-soft">{order.tracking_number}</p>
          {order.tracking_url_provider && (
            <a
              href={order.tracking_url_provider}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary mt-4"
            >
              Track your package
            </a>
          )}
        </div>
      )}

      <div className="mt-8 rounded-xl border border-line/70 bg-white p-5">
        <h2 className="font-medium text-ink">Items</h2>
        <ul className="mt-4 divide-y divide-line/70 text-sm">
          {items.map((item, i) => (
            <li key={i} className="flex justify-between gap-4 py-3 first:pt-0">
              <span className="text-ink">
                {item.title}
                {item.variant_title !== 'OS' && (
                  <span className="text-ink-soft"> · {item.variant_title}</span>
                )}
                <span className="text-ink-faint"> × {item.qty}</span>
              </span>
              <span className="tabular-nums">{formatPrice(item.line_total_cents)}</span>
            </li>
          ))}
        </ul>

        <dl className="mt-4 space-y-2 border-t border-line/70 pt-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-ink-soft">Subtotal</dt>
            <dd className="tabular-nums">{formatPrice(order.subtotal_cents)}</dd>
          </div>
          {order.discount_cents > 0 && (
            <div className="flex justify-between text-cch-blue">
              <dt>Discount</dt>
              <dd className="tabular-nums">−{formatPrice(order.discount_cents)}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-ink-soft">Shipping</dt>
            <dd className="tabular-nums">
              {order.free_shipping_applied ? 'Free' : formatPrice(order.shipping_cents)}
            </dd>
          </div>
          {order.tax_cents > 0 && (
            <div className="flex justify-between">
              <dt className="text-ink-soft">Tax</dt>
              <dd className="tabular-nums">{formatPrice(order.tax_cents)}</dd>
            </div>
          )}
          <div className="flex justify-between border-t border-line/70 pt-2 font-semibold">
            <dt>Total</dt>
            <dd className="tabular-nums">{formatPrice(order.total_cents)}</dd>
          </div>
        </dl>
      </div>

      <div className="mt-6 rounded-xl border border-line/70 bg-white p-5 text-sm">
        <h2 className="font-medium text-ink">Shipping to</h2>
        <address className="mt-2 not-italic leading-relaxed text-ink-soft">
          {order.shipping_name}
          <br />
          {order.shipping_address1}
          <br />
          {order.shipping_address2 && (
            <>
              {order.shipping_address2}
              <br />
            </>
          )}
          {order.shipping_city}, {order.shipping_state} {order.shipping_zip}
        </address>
      </div>

      <p className="mt-8 text-center text-sm text-ink-soft">
        Questions about this order?{' '}
        <a
          href={`mailto:info@calabasascoffeehouse.com?subject=Order%20CCH-${order.order_number}`}
          className="underline hover:text-cch-blue"
        >
          Email us
        </a>
      </p>
    </div>
  );
}

'use client';

import { use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { formatPrice, availableActions } from '@cch/shared';
import type { Order, OrderItem, OrderEvent, OrderStatus } from '@cch/shared';
import { supabase } from '@/lib/supabase';
import { StatusPill } from '@/components/StatusPill';
import { BuyLabelPanel } from '@/components/BuyLabelPanel';
import { RefundPanel } from '@/components/RefundPanel';

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [events, setEvents] = useState<OrderEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  const load = useCallback(async () => {
    const sb = supabase();
    const [{ data: o }, { data: i }, { data: e }] = await Promise.all([
      sb.from('orders').select('*').eq('id', id).single(),
      sb.from('order_items').select('*').eq('order_id', id).order('created_at'),
      sb.from('order_events').select('*').eq('order_id', id).order('created_at', { ascending: false }),
    ]);
    setOrder(o as Order | null);
    setItems((i ?? []) as OrderItem[]);
    setEvents((e ?? []) as OrderEvent[]);
    setNotes((o as Order | null)?.admin_notes ?? '');
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function markShipped() {
    if (!order) return;
    setBusy('ship');
    setError(null);
    try {
      const sb = supabase();
      // Admins can update orders directly under the RLS policy from 021;
      // no edge function needed since this touches nothing external.
      const { error: e } = await sb
        .from('orders')
        .update({ status: 'shipped', shipped_at: new Date().toISOString() })
        .eq('id', order.id);
      if (e) throw e;
      await sb.rpc('create_order_event', {
        p_order_id: order.id,
        p_type: 'marked_shipped',
        p_payload: null,
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not mark shipped');
    } finally {
      setBusy(null);
    }
  }

  async function markDelivered() {
    if (!order) return;
    setBusy('deliver');
    try {
      const sb = supabase();
      await sb
        .from('orders')
        .update({ status: 'delivered', delivered_at: new Date().toISOString() })
        .eq('id', order.id);
      await sb.rpc('create_order_event', {
        p_order_id: order.id,
        p_type: 'delivered',
        p_payload: null,
      });
      await load();
    } finally {
      setBusy(null);
    }
  }

  async function saveNotes() {
    if (!order) return;
    setBusy('notes');
    try {
      await supabase().from('orders').update({ admin_notes: notes }).eq('id', order.id);
      await load();
    } finally {
      setBusy(null);
    }
  }

  if (loading) return <p className="text-slate-500">Loading order…</p>;
  if (!order) return <p className="text-slate-500">Order not found.</p>;

  const actions = availableActions(order.status as OrderStatus);
  const labelCost = (order.parcel_used as { cost_cents?: number } | null)?.cost_cents;
  // What the label actually cost versus what the customer was charged for
  // shipping. Negative means CCH absorbed the difference.
  const shippingMargin =
    typeof labelCost === 'number' ? order.shipping_cents - labelCost : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/orders" className="text-sm text-cch-blue underline">
            ← Orders
          </Link>
          <h1 className="mt-1 flex items-center gap-3 text-2xl font-semibold tracking-tight">
            CCH-{order.order_number}
            <StatusPill status={order.status as OrderStatus} />
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {new Date(order.created_at).toLocaleString('en-US', {
              dateStyle: 'medium',
              timeStyle: 'short',
            })}{' '}
            · via {order.channel} · {order.user_id ? 'account' : 'guest'}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {order.shippo_label_url && (
            <a
              href={order.shippo_label_url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary"
            >
              Print label
            </a>
          )}
          {actions.includes('mark_shipped') && (
            <button onClick={markShipped} disabled={busy === 'ship'} className="btn-primary">
              {busy === 'ship' ? 'Saving…' : 'Mark shipped'}
            </button>
          )}
          {actions.includes('mark_delivered') && (
            <button onClick={markDelivered} disabled={busy === 'deliver'} className="btn-secondary">
              Mark delivered
            </button>
          )}
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {order.label_error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <h2 className="font-medium text-red-800">Label purchase failed</h2>
          <p className="mt-1 text-sm text-red-700">{order.label_error}</p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          {/* Fulfillment */}
          {(actions.includes('buy_label') || actions.includes('retry_label')) && (
            <BuyLabelPanel
              order={order}
              items={items}
              onDone={load}
              retry={actions.includes('retry_label')}
            />
          )}

          {/* Items */}
          <div className="card">
            <div className="border-b border-slate-200 px-4 py-3">
              <h2 className="font-medium">Items to pack</h2>
            </div>
            <table className="w-full">
              <tbody className="divide-y divide-slate-100">
                {items.map((it) => (
                  <tr key={it.id}>
                    <td className="td">
                      <div className="font-medium">{it.title}</div>
                      <div className="text-xs text-slate-500">
                        {it.variant_title} · <span className="font-mono">{it.sku}</span>
                      </div>
                    </td>
                    <td className="td text-center text-lg font-semibold tabular-nums">
                      ×{it.qty}
                    </td>
                    <td className="td text-right tabular-nums">
                      {formatPrice(it.line_total_cents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Money */}
          <div className="card p-4">
            <h2 className="mb-3 font-medium">Money</h2>
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500">Subtotal</dt>
                <dd className="tabular-nums">{formatPrice(order.subtotal_cents)}</dd>
              </div>
              {order.discount_cents > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <dt>Discount {order.discount_code && `(${order.discount_code})`}</dt>
                  <dd className="tabular-nums">−{formatPrice(order.discount_cents)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-slate-500">
                  Shipping charged {order.free_shipping_applied && '(free shipping)'}
                </dt>
                <dd className="tabular-nums">{formatPrice(order.shipping_cents)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Tax collected</dt>
                <dd className="tabular-nums">{formatPrice(order.tax_cents)}</dd>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-1.5 font-semibold">
                <dt>Customer paid</dt>
                <dd className="tabular-nums">{formatPrice(order.total_cents)}</dd>
              </div>
              {order.refunded_cents > 0 && (
                <div className="flex justify-between text-purple-700">
                  <dt>Refunded</dt>
                  <dd className="tabular-nums">−{formatPrice(order.refunded_cents)}</dd>
                </div>
              )}
              {typeof labelCost === 'number' && (
                <>
                  <div className="flex justify-between border-t border-slate-200 pt-1.5 text-slate-500">
                    <dt>Label cost</dt>
                    <dd className="tabular-nums">−{formatPrice(labelCost)}</dd>
                  </div>
                  <div className="flex justify-between text-xs">
                    <dt className="text-slate-500">Shipping margin</dt>
                    <dd
                      className={`tabular-nums ${
                        (shippingMargin ?? 0) < 0 ? 'text-amber-700' : 'text-slate-500'
                      }`}
                    >
                      {(shippingMargin ?? 0) < 0 ? '−' : ''}
                      {formatPrice(Math.abs(shippingMargin ?? 0))}
                    </dd>
                  </div>
                </>
              )}
            </dl>
          </div>

          {actions.includes('refund') && (
            <RefundPanel order={order} onDone={load} />
          )}

          {/* History */}
          <div className="card">
            <div className="border-b border-slate-200 px-4 py-3">
              <h2 className="font-medium">History</h2>
            </div>
            <ul className="divide-y divide-slate-100">
              {events.length === 0 && (
                <li className="p-4 text-sm text-slate-500">No events yet.</li>
              )}
              {events.map((ev) => (
                <li key={ev.id} className="flex justify-between gap-4 px-4 py-2.5 text-sm">
                  <span className="font-medium">{ev.type.replace(/_/g, ' ')}</span>
                  <span className="text-slate-500">
                    {new Date(ev.created_at).toLocaleString('en-US', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Sidebar */}
        <aside className="space-y-6">
          <div className="card p-4 text-sm">
            <h2 className="mb-2 font-medium">Ship to</h2>
            <address className="not-italic leading-relaxed text-slate-600">
              {order.shipping_name}
              <br />
              {order.shipping_address1}
              <br />
              {order.shipping_address2 && (<>{order.shipping_address2}<br /></>)}
              {order.shipping_city}, {order.shipping_state} {order.shipping_zip}
              <br />
              {order.shipping_country}
            </address>
            <div className="mt-3 border-t border-slate-100 pt-3">
              <a href={`mailto:${order.shipping_email}`} className="text-cch-blue underline">
                {order.shipping_email}
              </a>
              {order.shipping_phone && (
                <div className="mt-1 text-slate-600">{order.shipping_phone}</div>
              )}
            </div>
          </div>

          {order.tracking_number && (
            <div className="card p-4 text-sm">
              <h2 className="mb-2 font-medium">Tracking</h2>
              <p className="font-mono text-xs break-all text-slate-600">
                {order.tracking_number}
              </p>
              {order.tracking_url_provider && (
                <a
                  href={order.tracking_url_provider}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block text-cch-blue underline"
                >
                  Track package
                </a>
              )}
            </div>
          )}

          <div className="card p-4">
            <h2 className="mb-2 text-sm font-medium">Internal notes</h2>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="field resize-y"
              placeholder="Only staff see this."
            />
            <button
              onClick={saveNotes}
              disabled={busy === 'notes' || notes === (order.admin_notes ?? '')}
              className="btn-secondary mt-2 w-full"
            >
              {busy === 'notes' ? 'Saving…' : 'Save notes'}
            </button>
          </div>

          <div className="card p-4 text-xs text-slate-500">
            <h2 className="mb-2 text-sm font-medium text-slate-900">Emails sent</h2>
            <ul className="space-y-1">
              <li>Receipt: {order.receipt_email_sent_at ? '✓' : '—'}</li>
              <li>Staff alert: {order.fulfillment_email_sent_at ? '✓' : '—'}</li>
              <li>
                Shipping notice: {order.shipment_confirmation_email_sent_at ? '✓' : '—'}
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}

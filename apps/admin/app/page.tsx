'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatPrice, ADMIN_STATUS_LABEL, netRevenueCents, REVENUE_STATUSES } from '@cch/shared';
import type { AdminOrderSummary } from '@cch/shared';
import { supabase } from '@/lib/supabase';
import { StatCard } from '@/components/StatCard';
import { StatusPill } from '@/components/StatusPill';

interface LowStock {
  id: string;
  title: string;
  sku: string;
  inventory_qty: number;
  low_stock_threshold: number;
}

export default function OverviewPage() {
  const [orders, setOrders] = useState<AdminOrderSummary[]>([]);
  const [lowStock, setLowStock] = useState<LowStock[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sb = supabase();
    (async () => {
      const [{ data: orderRows }, { data: stockRows }] = await Promise.all([
        sb
          .from('admin_order_summary')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(500),
        sb
          .from('product_variants')
          .select('id, title, sku, inventory_qty, low_stock_threshold')
          .eq('active', true)
          .order('inventory_qty', { ascending: true })
          .limit(100),
      ]);

      setOrders((orderRows ?? []) as AdminOrderSummary[]);
      setLowStock(
        ((stockRows ?? []) as LowStock[]).filter(
          (v) => v.inventory_qty <= v.low_stock_threshold
        )
      );
      setLoading(false);
    })();
  }, []);

  if (loading) return <p className="text-slate-500">Loading…</p>;

  // Only orders that actually took money count toward revenue. 'created'
  // (started but never paid) and 'payment_failed' are excluded.
  const paid = orders.filter((o) => REVENUE_STATUSES.includes(o.status));
  const revenue = paid.reduce((sum, o) => sum + netRevenueCents(o), 0);

  const now = Date.now();
  const since = (days: number) =>
    paid.filter((o) => now - new Date(o.created_at).getTime() < days * 864e5);
  const revenueIn = (days: number) =>
    since(days).reduce((sum, o) => sum + netRevenueCents(o), 0);

  const needsPacking = orders.filter((o) => o.status === 'paid');
  const labelReady = orders.filter((o) => o.status === 'label_purchased');
  const problems = orders.filter(
    (o) => o.status === 'label_failed' || o.status === 'payment_failed'
  );
  const outstandingValue = [...needsPacking, ...labelReady].reduce(
    (s, o) => s + o.total_cents,
    0
  );

  // Where orders are going — surfaces out-of-state concentration, which is the
  // early warning for needing a tax registration in another state.
  const byState = Object.entries(
    paid.reduce<Record<string, { count: number; cents: number }>>((acc, o) => {
      const k = o.shipping_state?.toUpperCase() || '—';
      acc[k] ??= { count: 0, cents: 0 };
      acc[k].count += 1;
      acc[k].cents += netRevenueCents(o);
      return acc;
    }, {})
  )
    .sort((a, b) => b[1].cents - a[1].cents)
    .slice(0, 8);

  const webCount = paid.filter((o) => o.channel === 'web').length;
  const appCount = paid.filter((o) => o.channel === 'app').length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="mt-1 text-sm text-slate-500">
          {paid.length} paid order{paid.length === 1 ? '' : 's'} all time
        </p>
      </div>

      {problems.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <h2 className="font-medium text-red-800">
            {problems.length} order{problems.length === 1 ? '' : 's'} need attention
          </h2>
          <ul className="mt-2 space-y-1 text-sm">
            {problems.slice(0, 5).map((o) => (
              <li key={o.id}>
                <Link href={`/orders/${o.id}`} className="text-red-700 underline">
                  CCH-{o.order_number}
                </Link>{' '}
                <span className="text-red-600">
                  — {ADMIN_STATUS_LABEL[o.status]}
                  {o.label_error ? `: ${o.label_error.slice(0, 90)}` : ''}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Revenue, all time" value={formatPrice(revenue)} />
        <StatCard label="Last 30 days" value={formatPrice(revenueIn(30))} sub={`${since(30).length} orders`} />
        <StatCard label="Last 7 days" value={formatPrice(revenueIn(7))} sub={`${since(7).length} orders`} />
        <StatCard
          label="Average order"
          value={paid.length ? formatPrice(Math.round(revenue / paid.length)) : '—'}
        />
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Needs packing"
          value={String(needsPacking.length)}
          sub="Paid, no label yet"
          href="/orders?status=paid"
          emphasis={needsPacking.length > 0}
        />
        <StatCard
          label="Label ready to ship"
          value={String(labelReady.length)}
          sub="Bought, not handed to carrier"
          href="/orders?status=label_purchased"
        />
        <StatCard
          label="Outstanding value"
          value={formatPrice(outstandingValue)}
          sub="Owed to customers"
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        {/* Fulfillment queue */}
        <div className="card">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <h2 className="font-medium">Needs packing</h2>
            <Link href="/orders" className="text-sm text-cch-blue underline">
              All orders
            </Link>
          </div>
          {needsPacking.length === 0 ? (
            <p className="p-6 text-center text-sm text-slate-500">
              Nothing waiting. Everything paid has a label.
            </p>
          ) : (
            <table className="w-full">
              <tbody className="divide-y divide-slate-100">
                {needsPacking.slice(0, 8).map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50">
                    <td className="td">
                      <Link href={`/orders/${o.id}`} className="font-medium text-cch-blue">
                        CCH-{o.order_number}
                      </Link>
                    </td>
                    <td className="td">{o.shipping_name}</td>
                    <td className="td text-slate-500">
                      {o.item_count} item{o.item_count === 1 ? '' : 's'}
                    </td>
                    <td className="td text-right tabular-nums">
                      {formatPrice(o.total_cents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Low stock */}
        <div className="card">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <h2 className="font-medium">Running low</h2>
            <Link href="/products" className="text-sm text-cch-blue underline">
              Inventory
            </Link>
          </div>
          {lowStock.length === 0 ? (
            <p className="p-6 text-center text-sm text-slate-500">
              Everything is above its low-stock threshold.
            </p>
          ) : (
            <table className="w-full">
              <tbody className="divide-y divide-slate-100">
                {lowStock.slice(0, 8).map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50">
                    <td className="td font-mono text-xs">{v.sku}</td>
                    <td className="td text-right">
                      <span
                        className={`tabular-nums ${
                          v.inventory_qty === 0 ? 'font-semibold text-red-600' : 'text-amber-600'
                        }`}
                      >
                        {v.inventory_qty === 0 ? 'Out of stock' : `${v.inventory_qty} left`}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        {/* Destinations */}
        <div className="card">
          <div className="border-b border-slate-200 px-4 py-3">
            <h2 className="font-medium">Where it&apos;s going</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Sustained volume outside California may mean registering to collect
              tax in that state.
            </p>
          </div>
          {byState.length === 0 ? (
            <p className="p-6 text-center text-sm text-slate-500">No paid orders yet.</p>
          ) : (
            <table className="w-full">
              <tbody className="divide-y divide-slate-100">
                {byState.map(([state, s]) => (
                  <tr key={state}>
                    <td className="td font-medium">{state}</td>
                    <td className="td text-slate-500">
                      {s.count} order{s.count === 1 ? '' : 's'}
                    </td>
                    <td className="td text-right tabular-nums">{formatPrice(s.cents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Channel split */}
        <div className="card">
          <div className="border-b border-slate-200 px-4 py-3">
            <h2 className="font-medium">Website vs app</h2>
          </div>
          <div className="grid grid-cols-2 divide-x divide-slate-100">
            <div className="p-5 text-center">
              <p className="text-2xl font-semibold tabular-nums">{webCount}</p>
              <p className="mt-1 text-sm text-slate-500">Website</p>
            </div>
            <div className="p-5 text-center">
              <p className="text-2xl font-semibold tabular-nums">{appCount}</p>
              <p className="mt-1 text-sm text-slate-500">App</p>
            </div>
          </div>
        </div>
      </section>

      {/* Recent activity */}
      <section className="card">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="font-medium">Recent orders</h2>
        </div>
        {orders.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">
            No orders yet. Your first will be CCH-1000.
          </p>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="th">Order</th>
                <th className="th">Customer</th>
                <th className="th">Status</th>
                <th className="th">Placed</th>
                <th className="th text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.slice(0, 10).map((o) => (
                <tr key={o.id} className="hover:bg-slate-50">
                  <td className="td">
                    <Link href={`/orders/${o.id}`} className="font-medium text-cch-blue">
                      CCH-{o.order_number}
                    </Link>
                  </td>
                  <td className="td">
                    {o.shipping_name}
                    {o.is_guest && (
                      <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] uppercase text-slate-500">
                        guest
                      </span>
                    )}
                  </td>
                  <td className="td"><StatusPill status={o.status} /></td>
                  <td className="td text-slate-500">
                    {new Date(o.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </td>
                  <td className="td text-right tabular-nums">{formatPrice(o.total_cents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { formatPrice, ADMIN_STATUS_LABEL } from '@cch/shared';
import type { AdminOrderSummary, OrderStatus } from '@cch/shared';
import { supabase } from '@/lib/supabase';
import { StatusPill } from '@/components/StatusPill';

const FILTERS: Array<{ key: string; label: string; match: (o: AdminOrderSummary) => boolean }> = [
  { key: 'needs_packing', label: 'Needs packing', match: (o) => o.status === 'paid' },
  { key: 'label_purchased', label: 'Label ready', match: (o) => o.status === 'label_purchased' },
  { key: 'shipped', label: 'Shipped', match: (o) => o.status === 'shipped' || o.status === 'delivered' },
  { key: 'problems', label: 'Problems', match: (o) => o.status === 'label_failed' || o.status === 'payment_failed' },
  { key: 'refunded', label: 'Refunded', match: (o) => o.status === 'refunded' || o.status === 'partially_refunded' },
  { key: 'all', label: 'All', match: () => true },
];

function OrdersInner() {
  const params = useSearchParams();
  const statusParam = params.get('status');

  const [orders, setOrders] = useState<AdminOrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>(
    statusParam === 'paid' ? 'needs_packing' : statusParam === 'label_purchased' ? 'label_purchased' : 'needs_packing'
  );
  const [search, setSearch] = useState('');

  useEffect(() => {
    supabase()
      .from('admin_order_summary')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1000)
      .then(({ data }) => {
        setOrders((data ?? []) as AdminOrderSummary[]);
        setLoading(false);
      });
  }, []);

  const visible = useMemo(() => {
    const active = FILTERS.find((f) => f.key === filter) ?? FILTERS[FILTERS.length - 1];
    const q = search.trim().toLowerCase();
    return orders.filter((o) => {
      if (!active.match(o)) return false;
      if (!q) return true;
      return (
        String(o.order_number).includes(q) ||
        o.shipping_name?.toLowerCase().includes(q) ||
        o.shipping_email?.toLowerCase().includes(q) ||
        o.tracking_number?.toLowerCase().includes(q)
      );
    });
  }, [orders, filter, search]);

  const counts = useMemo(
    () =>
      Object.fromEntries(
        FILTERS.map((f) => [f.key, orders.filter(f.match).length])
      ) as Record<string, number>,
    [orders]
  );

  if (loading) return <p className="text-slate-500">Loading orders…</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Orders</h1>

      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-lg px-3 py-1.5 text-sm transition ${
              filter === f.key
                ? 'bg-cch-blue text-white'
                : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            {f.label}
            <span className="ml-1.5 opacity-70 tabular-nums">{counts[f.key] ?? 0}</span>
          </button>
        ))}

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, email, order #, tracking"
          className="field ml-auto max-w-xs"
        />
      </div>

      <div className="card overflow-hidden">
        {visible.length === 0 ? (
          <p className="p-10 text-center text-sm text-slate-500">Nothing here.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[46rem]">
              <thead className="bg-slate-50">
                <tr>
                  <th className="th">Order</th>
                  <th className="th">Customer</th>
                  <th className="th">Destination</th>
                  <th className="th">Status</th>
                  <th className="th">Placed</th>
                  <th className="th text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50">
                    <td className="td">
                      <Link href={`/orders/${o.id}`} className="font-medium text-cch-blue">
                        CCH-{o.order_number}
                      </Link>
                      <span className="ml-2 text-[10px] uppercase text-slate-400">
                        {o.channel}
                      </span>
                    </td>
                    <td className="td">
                      <div>{o.shipping_name}</div>
                      <div className="text-xs text-slate-500">{o.shipping_email}</div>
                    </td>
                    <td className="td text-slate-600">
                      {o.shipping_city}, {o.shipping_state}
                    </td>
                    <td className="td">
                      <StatusPill status={o.status as OrderStatus} />
                      {o.label_error && (
                        <div className="mt-1 max-w-56 truncate text-xs text-red-600" title={o.label_error}>
                          {o.label_error}
                        </div>
                      )}
                    </td>
                    <td className="td text-slate-500">
                      {new Date(o.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: '2-digit',
                      })}
                    </td>
                    <td className="td text-right tabular-nums">
                      {formatPrice(o.total_cents)}
                      {o.refunded_cents > 0 && (
                        <div className="text-xs text-purple-700">
                          −{formatPrice(o.refunded_cents)}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-slate-400">
        Showing {visible.length} of {orders.length}. Statuses:{' '}
        {Object.entries(ADMIN_STATUS_LABEL)
          .slice(0, 3)
          .map(([, v]) => v)
          .join(' · ')} …
      </p>
    </div>
  );
}

export default function OrdersPage() {
  // useSearchParams needs a Suspense boundary in the App Router.
  return (
    <Suspense fallback={<p className="text-slate-500">Loading…</p>}>
      <OrdersInner />
    </Suspense>
  );
}

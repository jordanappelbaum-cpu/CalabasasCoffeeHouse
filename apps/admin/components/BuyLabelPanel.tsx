'use client';

import { useState } from 'react';
import { formatPrice } from '@cch/shared';
import type { Order, OrderItem } from '@cch/shared';
import { callAdminFunction } from '@/lib/supabase';

/**
 * Buys the shipping label, replacing v1's automatic purchase at payment time.
 *
 * The box fields default to the estimate made at checkout but are editable,
 * because the person packing knows what actually went in the box — and the
 * carrier bills on the real dimensions, not our guess.
 */
export function BuyLabelPanel({
  order,
  items,
  onDone,
  retry,
}: {
  order: Order;
  items: OrderItem[];
  onDone: () => void | Promise<void>;
  retry?: boolean;
}) {
  const estimate = order.parcel_used;
  const [useEstimate, setUseEstimate] = useState(true);
  const [box, setBox] = useState({
    length_in: String(estimate?.length_in ?? 10),
    width_in: String(estimate?.width_in ?? 8),
    height_in: String(estimate?.height_in ?? 4),
    weight_oz: String(estimate?.weight_oz ?? 12),
  });

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    tracking_number: string;
    cost_cents: number;
    carrier: string;
    service: string;
    charged_customer_cents: number;
  } | null>(null);

  async function buy() {
    setBusy(true);
    setError(null);
    try {
      const res = await callAdminFunction<{
        tracking_number: string;
        cost_cents: number;
        carrier: string;
        service: string;
        charged_customer_cents: number;
        already_purchased?: boolean;
      }>('admin_buy_label', {
        order_id: order.id,
        parcel: useEstimate
          ? null
          : {
              length_in: Number(box.length_in),
              width_in: Number(box.width_in),
              height_in: Number(box.height_in),
              weight_oz: Number(box.weight_oz),
            },
      });
      setResult(res);
      await onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not buy the label');
    } finally {
      setBusy(false);
    }
  }

  if (result) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
        <h2 className="font-medium text-emerald-900">Label bought</h2>
        <p className="mt-1 text-sm text-emerald-800">
          {result.carrier} {result.service} · {formatPrice(result.cost_cents)} · tracking{' '}
          <span className="font-mono">{result.tracking_number}</span>
        </p>
        <p className="mt-1 text-xs text-emerald-700">
          The label PDF has been emailed to the fulfillment inbox, and the customer
          has been sent tracking.
        </p>
      </div>
    );
  }

  const totalUnits = items.reduce((n, i) => n + i.qty, 0);

  return (
    <div className="card border-cch-blue/40 p-4">
      <h2 className="font-medium">
        {retry ? 'Retry shipping label' : 'Buy shipping label'}
      </h2>
      <p className="mt-1 text-sm text-slate-600">
        Pack the {totalUnits} item{totalUnits === 1 ? '' : 's'} below, then buy the label.
        The customer was charged{' '}
        <strong>
          {order.free_shipping_applied
            ? 'nothing (free shipping)'
            : formatPrice(order.shipping_cents)}
        </strong>{' '}
        for shipping.
      </p>

      <div className="mt-4 space-y-3">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={useEstimate}
            onChange={(e) => setUseEstimate(e.target.checked)}
            className="accent-cch-blue"
          />
          Use the estimated box
          {estimate && (
            <span className="text-slate-500">
              ({estimate.length_in}×{estimate.width_in}×{estimate.height_in} in,{' '}
              {estimate.weight_oz} oz)
            </span>
          )}
        </label>

        {!useEstimate && (
          <div className="grid grid-cols-4 gap-2">
            {(['length_in', 'width_in', 'height_in', 'weight_oz'] as const).map((f) => (
              <div key={f}>
                <label className="label">
                  {f === 'weight_oz' ? 'Weight (oz)' : f.replace('_in', '') + ' (in)'}
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  className="field"
                  value={box[f]}
                  onChange={(e) => setBox({ ...box, [f]: e.target.value })}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <button onClick={buy} disabled={busy} className="btn-primary mt-4">
        {busy ? 'Buying label…' : 'Buy label'}
      </button>
      <p className="mt-2 text-xs text-slate-500">
        This charges your Shippo account and cannot be undone from here.
      </p>
    </div>
  );
}

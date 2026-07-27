'use client';

import { useState } from 'react';
import { formatPrice } from '@cch/shared';
import type { Order } from '@cch/shared';
import { callAdminFunction } from '@/lib/supabase';

/**
 * Issues a refund through Stripe.
 *
 * The database is NOT written here. Stripe fires charge.refunded, and the
 * webhook is what updates the order and returns stock. Writing both here and
 * in the webhook would double-count on a full refund.
 */
export function RefundPanel({ order, onDone }: { order: Order; onDone: () => void | Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refundable = order.total_cents - order.refunded_cents;

  async function refund(full: boolean) {
    const cents = full ? refundable : Math.round(parseFloat(amount || '0') * 100);
    if (!cents || cents <= 0 || cents > refundable) {
      setError(`Enter an amount between $0.01 and ${formatPrice(refundable)}`);
      return;
    }
    if (
      !confirm(
        `Refund ${formatPrice(cents)} to ${order.shipping_name}? This moves real money and cannot be undone.`
      )
    ) {
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await callAdminFunction('admin_refund', {
        order_id: order.id,
        amount_cents: cents,
        reason: reason || null,
      });
      // Give the webhook a moment to land before re-reading.
      setTimeout(onDone, 1500);
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Refund failed');
    } finally {
      setBusy(false);
    }
  }

  if (refundable <= 0) return null;

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-medium">Refund</h2>
          <p className="text-sm text-slate-500">
            {formatPrice(refundable)} still refundable
          </p>
        </div>
        {!open && (
          <button onClick={() => setOpen(true)} className="btn-danger">
            Issue refund
          </button>
        )}
      </div>

      {open && (
        <div className="mt-4 space-y-3 border-t border-slate-200 pt-4">
          <div>
            <label htmlFor="refund-amount" className="label">
              Partial amount (leave blank for full)
            </label>
            <input
              id="refund-amount"
              type="number"
              step="0.01"
              min="0.01"
              max={(refundable / 100).toFixed(2)}
              className="field"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={(refundable / 100).toFixed(2)}
            />
          </div>

          <div>
            <label htmlFor="refund-reason" className="label">Reason (internal)</label>
            <input
              id="refund-reason"
              className="field"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Wrong size, damaged, customer request…"
            />
          </div>

          {error && (
            <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}

          <div className="flex gap-2">
            <button onClick={() => refund(!amount)} disabled={busy} className="btn-danger">
              {busy
                ? 'Refunding…'
                : amount
                  ? `Refund $${amount}`
                  : `Refund ${formatPrice(refundable)}`}
            </button>
            <button onClick={() => setOpen(false)} className="btn-secondary">
              Cancel
            </button>
          </div>

          <p className="text-xs text-slate-500">
            A full refund on an unshipped order returns the items to stock and
            emails the customer.
          </p>
        </div>
      )}
    </div>
  );
}

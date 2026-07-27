'use client';

import { useState } from 'react';
import { lookupOrder, ApiError, type LookupResponse } from '@/lib/api';
import { OrderView } from '@/components/OrderView';

export default function TrackPage() {
  const [orderNumber, setOrderNumber] = useState('');
  const [email, setEmail] = useState('');
  const [data, setData] = useState<LookupResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      // Both are required: order numbers are sequential, so the email is what
      // stops anyone from walking the range and reading other people's orders.
      const res = await lookupOrder({
        order_number: Number(orderNumber.replace(/\D/g, '')),
        email: email.trim(),
      });
      setData(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not find that order');
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  if (data) return <OrderView data={data} />;

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="font-display text-3xl font-semibold text-cch-blue">Track your order</h1>
      <p className="mt-2 text-sm text-ink-soft">
        Enter your order number and the email you used at checkout.
      </p>

      <form onSubmit={submit} className="mt-8 space-y-4">
        <div>
          <label htmlFor="order" className="label">Order number</label>
          <input
            id="order"
            className="field"
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            placeholder="CCH-1000"
            required
          />
        </div>
        <div>
          <label htmlFor="email" className="label">Email</label>
          <input
            id="email"
            type="email"
            className="field"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        {error && (
          <p role="alert" className="rounded-lg bg-white p-3 text-sm text-ink ring-1 ring-red-300">
            {error}
          </p>
        )}

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Looking…' : 'Find my order'}
        </button>
      </form>
    </div>
  );
}

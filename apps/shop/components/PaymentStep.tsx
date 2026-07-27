'use client';

import { useState } from 'react';
import { PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { formatPrice } from '@cch/shared';
import { useCart } from '@/lib/cart';

interface Props {
  orderNumber: number;
  guestToken: string;
  totalCents: number;
  email: string;
  onBack: () => void;
}

export function PaymentStep({ orderNumber, guestToken, totalCents, email, onBack }: Props) {
  const stripe = useStripe();
  const elements = useElements();
  const { clear } = useCart();

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;

    setSubmitting(true);
    setError(null);

    // The guest token is the customer's only way back to this order, so it
    // goes in the return URL. Stored before redirecting in case the customer
    // closes the tab mid-redirect.
    const returnUrl = `${window.location.origin}/order/${guestToken}`;
    try {
      localStorage.setItem('cch_last_order', guestToken);
    } catch {
      // Private mode — the return URL still carries it.
    }

    const { error: stripeError } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: returnUrl, receipt_email: email },
    });

    // Reaching here always means failure — on success the browser has already
    // been redirected to return_url.
    if (stripeError) {
      setError(
        stripeError.type === 'card_error' || stripeError.type === 'validation_error'
          ? stripeError.message ?? 'Your payment could not be completed'
          : 'Something went wrong processing your payment'
      );
      setSubmitting(false);
      return;
    }

    // Payment methods that complete without a redirect land here.
    clear();
    setSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-xl font-semibold text-cch-blue">Payment</h2>
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-ink-soft underline hover:text-cch-blue"
        >
          Edit details
        </button>
      </div>

      <p className="mt-1 text-sm text-ink-soft">
        Order CCH-{orderNumber}
      </p>

      <div className="mt-5">
        <PaymentElement options={{ layout: 'tabs' }} />
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-lg bg-white p-4 text-sm text-ink ring-1 ring-red-300">
          {error}
        </p>
      )}

      <button type="submit" disabled={!stripe || submitting} className="btn-primary mt-6 w-full">
        {submitting ? 'Processing…' : `Pay ${formatPrice(totalCents)}`}
      </button>

      <p className="mt-3 text-center text-xs text-ink-faint">
        Payments are processed by Stripe. We never see your card details.
      </p>
    </form>
  );
}

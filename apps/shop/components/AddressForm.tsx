'use client';

import type { ShippingAddress } from '@cch/shared';

export const EMPTY_ADDRESS: ShippingAddress = {
  name: '',
  email: '',
  phone: '',
  address1: '',
  address2: '',
  city: '',
  state: '',
  zip: '',
  country: 'US',
};

/**
 * Whether the address is complete enough to quote shipping.
 *
 * Kept intentionally loose — the server validates properly, and Shippo will
 * reject a genuinely bad address. Being strict here just means the customer
 * sees "no rates" without knowing why.
 */
export function isAddressComplete(a: ShippingAddress): boolean {
  return Boolean(
    a.name.trim() &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(a.email) &&
      a.address1.trim() &&
      a.city.trim() &&
      a.state.trim().length >= 2 &&
      /^\d{5}(-\d{4})?$/.test(a.zip.trim())
  );
}

interface Props {
  value: ShippingAddress;
  onChange: (next: ShippingAddress) => void;
}

export function AddressForm({ value, onChange }: Props) {
  const set = (field: keyof ShippingAddress) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...value, [field]: e.target.value });

  return (
    <section>
      <h2 className="font-display text-xl font-semibold text-cch-blue">Where should we send it?</h2>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="name" className="label">Full name</label>
          <input
            id="name"
            className="field"
            value={value.name}
            onChange={set('name')}
            autoComplete="name"
            required
          />
        </div>

        <div>
          <label htmlFor="email" className="label">Email</label>
          <input
            id="email"
            type="email"
            className="field"
            value={value.email}
            onChange={set('email')}
            autoComplete="email"
            required
            aria-describedby="email-hint"
          />
          <p id="email-hint" className="mt-1 text-xs text-ink-faint">
            Receipt and tracking go here.
          </p>
        </div>

        <div>
          <label htmlFor="phone" className="label">
            Phone <span className="font-normal text-ink-faint">(optional)</span>
          </label>
          <input
            id="phone"
            type="tel"
            className="field"
            value={value.phone ?? ''}
            onChange={set('phone')}
            autoComplete="tel"
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="address1" className="label">Street address</label>
          <input
            id="address1"
            className="field"
            value={value.address1}
            onChange={set('address1')}
            autoComplete="address-line1"
            required
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="address2" className="label">
            Apartment, suite, etc. <span className="font-normal text-ink-faint">(optional)</span>
          </label>
          <input
            id="address2"
            className="field"
            value={value.address2 ?? ''}
            onChange={set('address2')}
            autoComplete="address-line2"
          />
        </div>

        <div>
          <label htmlFor="city" className="label">City</label>
          <input
            id="city"
            className="field"
            value={value.city}
            onChange={set('city')}
            autoComplete="address-level2"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="state" className="label">State</label>
            <input
              id="state"
              className="field uppercase"
              value={value.state}
              onChange={(e) =>
                onChange({ ...value, state: e.target.value.toUpperCase().slice(0, 2) })
              }
              autoComplete="address-level1"
              maxLength={2}
              placeholder="CA"
              required
            />
          </div>
          <div>
            <label htmlFor="zip" className="label">ZIP</label>
            <input
              id="zip"
              className="field"
              value={value.zip}
              onChange={set('zip')}
              autoComplete="postal-code"
              inputMode="numeric"
              maxLength={10}
              required
            />
          </div>
        </div>
      </div>

      <p className="mt-4 text-xs text-ink-faint">
        We ship within the United States only.
      </p>
    </section>
  );
}

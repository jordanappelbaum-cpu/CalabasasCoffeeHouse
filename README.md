# Calabasas Coffee House — Web Store & Admin

Online store and staff dashboard for [Calabasas Coffee House](https://calabasascoffeehouse.com).

> **This repository is public.** Only publishable keys belong in it — the Supabase
> anon key (protected by Row Level Security) and the Stripe publishable key.
> Every real secret lives in Supabase Edge Function secrets and Netlify
> environment variables, never in this tree.

## What's here

| Path | What it is | Deployed to |
|---|---|---|
| `apps/shop` | Customer storefront, guest checkout | `shop.calabasascoffeehouse.com` |
| `apps/admin` | Staff dashboard: orders, fulfillment, inventory | `admin.calabasascoffeehouse.com` |
| `packages/shared` | Types, money helpers, order lifecycle rules | — |

The cafe website itself (`calabasascoffeehouse.com`) is **not** in this repo. It
runs on Toast Sites and is unchanged; the shop links back to it for menu, online
ordering and gift cards.

## How the shop actually works

Everything runs off one Supabase project (`qthptztogfcufabviyrx`), shared with
the CCH mobile app, so app orders and web orders land in the same queue.

```
customer                 Supabase Edge Functions          external
────────                 ───────────────────────          ────────
browse       ──────────► shop_get_products
add to cart
checkout     ──────────► shop_quote ────────────────────► Shippo (rates)
                                    ────────────────────► Stripe Tax
pay          ──────────► shop_create_payment_intent ────► Stripe
                              │
                              ▼  (order: status "created")
Stripe  ───webhook──────► stripe_webhook
                              │  mark paid, decrement stock,
                              │  record tax transaction
                              ├──────────────────────────► Resend (receipt)
                              └──────────────────────────► Resend (staff alert)
                              ▼
                         order sits in "needs packing"
                              │
staff packs it, then in the dashboard:
                              │
             ──────────► admin_buy_label ────────────────► Shippo (buy label)
                              ├──────────────────────────► Resend (label PDF)
                              └──────────────────────────► Resend (tracking)
                              ▼
                         "label ready" → Mark shipped → shipped
```

### Two things worth knowing

**Labels are bought by a person, not automatically.** An earlier version bought
a Shippo label the instant payment cleared. That meant every paid order had a
label whether or not anyone had packed it, the box size was always a guess, and
cancelling an order left a paid-for label behind. Now `paid` is a real
"needs packing" queue and staff buy the label with the actual box in hand.

**Inventory decrements on payment, not on label purchase.** Under the old flow a
paid order held no stock until a label existed, which allowed overselling.

### Money is never computed in the browser

`_shared/pricing.ts` in the Supabase functions repo is the only place a cart
price is calculated. `shop_quote` (display) and `shop_create_payment_intent`
(charge) both call it, so the quoted total and the charged total cannot drift.
Prices sent by the client are ignored entirely — only variant IDs and quantities
are taken as input.

## Local development

```bash
npm install
npm run dev:shop    # http://localhost:3000
npm run dev:admin   # http://localhost:3001
```

Copy `.env.example` to `.env.local` in each app and fill in the two public keys.

Note the storefront talks to the **live** Supabase project and the **live**
Stripe account. Completing a checkout locally charges a real card.

## Deploying

Two Netlify sites, both from this repo, distinguished by base directory:

| Site | Base directory | Domain |
|---|---|---|
| cch-shop | `apps/shop` | `shop.calabasascoffeehouse.com` |
| cch-admin | `apps/admin` | `admin.calabasascoffeehouse.com` |

Each needs these environment variables set in Netlify:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY   # shop only
NEXT_PUBLIC_SITE_URL                 # shop only
```

## Admin access

There is no sign-up. Access is granted by flipping a flag on an existing
account:

```sql
UPDATE public.profiles SET is_admin = true WHERE email = 'someone@example.com';
```

Revoke by setting it back to `false`. Row Level Security is the actual gate —
the dashboard hiding its own UI is a convenience, not the security boundary.
Every admin action is written to `admin_audit_log`.

## Database and edge functions

Schema and Edge Functions live with the mobile app repo
(`CCHMobileClean/supabase/`), because one Supabase project serves both the app
and the web store and a single migration history avoids conflicts.

Relevant migrations:

- `021_web_store_foundation.sql` — guest checkout, order numbers, tax and
  discount columns, per-variant shipping dimensions, product status, inventory
  auditing, admin RLS policies
- `022_public_merch_bucket.sql` — makes product images publicly readable so the
  website can cache them and link previews work

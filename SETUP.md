# Getting the CCH shop live — your checklist

Everything is built and the database is live. What's left is connecting the
pieces that need your login or your DNS. Work top to bottom; each step says
how to check it worked.

---

## Step 1 — Connect the repo to Netlify (10 minutes)

This is the only thing blocking the sites from going live. Netlify builds
monorepos correctly from a connected repo, which the command-line tool does not.

Do this **twice**, once per site.

### Site 1: the shop

1. Go to https://app.netlify.com → open the **cch-shop** project
2. **Site configuration** → **Build & deploy** → **Continuous deployment** → **Link repository**
3. Choose **GitHub**, authorise Netlify if asked, pick
   `jordanappelbaum-cpu/CalabasasCoffeeHouse`
4. Set these exactly:

   | Field | Value |
   |---|---|
   | Branch to deploy | `main` |
   | Base directory | `apps/shop` |
   | Build command | `npm run build` |
   | Publish directory | `apps/shop/.next` |

5. **Deploy site**

### Site 2: the dashboard

Same steps on the **cch-admin-646** project, but:

| Field | Value |
|---|---|
| Base directory | `apps/admin` |
| Build command | `npm run build` |
| Publish directory | `apps/admin/.next` |

**Environment variables are already set on both sites** — you don't need to add any.

**How to check it worked:** open https://cch-shop.netlify.app — you should see
the shop with hats and hoodies, not a "Page not found".

From now on, every push to `main` redeploys both sites automatically.

---

## Step 2 — Point your domains (15 minutes, plus DNS propagation)

Only after Step 1 shows a working site.

`calabasascoffeehouse.com` stays exactly as it is on Toast. You're only adding
two subdomains, so **nothing about your current website changes**.

In Netlify, for **cch-shop** → **Domain management** → **Add a domain** →
`shop.calabasascoffeehouse.com`. Netlify will show you the record to create.
It will be:

| Type | Name | Value |
|---|---|---|
| CNAME | `shop` | `cch-shop.netlify.app` |

Then for **cch-admin-646** → add `admin.calabasascoffeehouse.com`:

| Type | Name | Value |
|---|---|---|
| CNAME | `admin` | `cch-admin-646.netlify.app` |

Add both at whoever manages DNS for calabasascoffeehouse.com. HTTPS certificates
are issued automatically once the records resolve — usually minutes, up to a few
hours.

**How to check:** https://shop.calabasascoffeehouse.com loads the shop with a
padlock in the address bar.

---

## Step 3 — Add a "Shop" link to the Toast site

In your Toast Sites editor, add a navigation link pointing to
`https://shop.calabasascoffeehouse.com`.

This is the only change to your existing website, and it's the thing that
actually sends customers to the store.

---

## Step 4 — Test the app checkout

The app's merch checkout has never completed a sale. The cause was that Stripe
was offering payment methods that redirect out of the app (Klarna, Cash App,
Amazon Pay) while the app wasn't set up to handle a redirect, so the payment
sheet threw an error before it could open.

**That fix is already deployed to the server**, so it applies to the app already
on your phone — no App Store update needed.

Open the app → Shop → add something → checkout. The payment sheet should now
open. Tell me either way; if it still fails I need the exact error text.

---

## Step 5 — Do one real test order, then refund it

Nothing in this chain has ever run end to end with real money. One small order
proves the whole thing and exercises the refund path, which has never run at all.

1. On the shop, buy the **$13 mug**
2. Check: you get a receipt email, and info@calabasascoffeehouse.com gets a
   "needs packing" alert
3. Open https://admin.calabasascoffeehouse.com → the order shows under
   **Needs packing**
4. Click **Buy label** → the label PDF is emailed to you, the customer gets
   tracking
5. Click **Mark shipped**
6. Click **Issue refund** → full refund

Total cost: Stripe's fee (~60¢) plus the real shipping label (~$6). Worth it.

---

## Step 6 — Add the coffee and matcha products

Once you have names, prices, weights and photos:

1. https://admin.calabasascoffeehouse.com → **Inventory** → **New product**
2. Set **Category** to Coffee or Matcha — that automatically files it under
   **Good Things Brewing** on the website
3. Choose **Bag sizes** for the size preset (8 oz / 12 oz / 2 lb)
4. **Set the weight in ounces.** This matters more than anything else on the
   form — shipping is priced by weight, and a 2 lb bag quoted at the default
   estimate will lose you money on every order
5. Start it as **Draft**, add photos on the next screen, then switch to
   **Active** when it's ready

Products appear on the website within about a minute.

---

## Day-to-day, once live

| I want to… | Where |
|---|---|
| See what needs packing | Dashboard → Overview |
| Buy a shipping label | Dashboard → the order → Buy label |
| Change a price or stock level | Dashboard → Inventory |
| Add a product or photos | Dashboard → Inventory → New product |
| Run a promo code | Dashboard → Discounts |
| Pause the shop while away | Dashboard → Settings → uncheck "Accepting orders" |
| Give someone dashboard access | See below |

### Granting dashboard access

There's no sign-up page. The person makes a normal account in the CCH app,
then in the Supabase SQL editor:

```sql
UPDATE public.profiles SET is_admin = true WHERE email = 'them@example.com';
```

Revoke by setting it back to `false`. Every admin action is logged with who did it.

---

## Still outstanding (not blocking)

- **Migration 023** — run it in the Supabase SQL editor when convenient. It
  stops a customer deleting their account from also deleting their order
  history, which you need for tax records.
- **Coffee/matcha tax codes** — packaged food is taxed differently from apparel
  in California. Once your accountant confirms, those get set per product.
  Right now everything is taxed as general goods, which is correct for merch and
  probably over-collects on food.

---

## Running it on your own machine

Only needed if you want to preview changes before they go live.

```bash
cd ~/Documents/CCH/cch-web
npm install
npm run dev:shop     # http://localhost:3000
npm run dev:admin    # http://localhost:3001
```

Note this talks to the **live** database and **live** Stripe. A checkout on
localhost charges a real card.

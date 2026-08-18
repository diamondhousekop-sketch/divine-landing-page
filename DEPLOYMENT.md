# Diamond House — Deployment & Go-Live Guide

Production-ready e-commerce built on the existing TanStack Start app
(React 19 + TanStack Router + Vite + Nitro) with a Supabase backend,
Razorpay payments (COD + online), and Resend transactional emails.

> **Lovable sync note:** This repo is connected to Lovable.dev. Only ever make
> **normal forward commits**. Never `git push --force`, `git rebase`, or rewrite
> history on the connected branch, or it will de-sync from the Lovable editor.

---

## 0. What was added

```
src/lib/
  supabase.ts            Browser (anon) Supabase client — safe to bundle
  supabase.server.ts     Service-role client + requireAdmin() — SERVER ONLY
  razorpay.server.ts     Razorpay client + HMAC signature verification — SERVER ONLY
  email.server.ts        Resend bilingual (Marathi+English) templates — SERVER ONLY
  rate-limit.server.ts   In-memory rate limiter for order/payment endpoints
  http.server.ts         JSON response + order-number helpers
  queries.ts             Public reads (product/testimonials/content) w/ fallbacks
  types.ts               Shared domain types + fallback content
  admin-api.ts           Client fetch helpers (auth header injection)

src/routes/
  checkout.tsx                 Real order form (react-hook-form + zod)
  order-confirmation.tsx       Thank-you page + WhatsApp support
  admin/login.tsx              Supabase Auth email/password login
  admin/index.tsx              Dashboard (stats + 7-day revenue chart)
  admin/orders.tsx             Orders table + mobile cards + status updates
  admin/products.tsx           Product CRUD
  admin/testimonials.tsx       Testimonials CRUD
  admin/content.tsx            Editable site content + Razorpay key management
  api/orders.ts                POST create order (server re-prices, inserts, emails)
  api/config.ts                Public: is online payment enabled + public key id
  api/payment/create.ts        Server-side Razorpay order creation
  api/payment/verify.ts        Server-side signature verification
  api/webhook/razorpay.ts      Razorpay webhook (raw-body signature check)
  api/admin/orders.ts          List/filter orders, update status (auth required)
  api/admin/products.ts        Product CRUD API (auth required)
  api/admin/testimonials.ts    Testimonial CRUD API (auth required)
  api/admin/content.ts         site_content read/upsert (auth required)
  api/admin/settings.ts        Razorpay creds read (masked)/write (auth required)

supabase/migrations/0001_init.sql   Tables + RLS + seed data
ecosystem.config.cjs                 PM2 process config for Hostinger
.env.example                         All env vars documented
vite.config.ts                       Nitro preset overridden to `node-server`
```

---

## 1. Supabase setup  ⚠️ REQUIRED — do this first

The app cannot create/checkout/admin until the schema exists.

1. Open your project → **SQL Editor** → **New query**.
2. Paste the entire contents of `supabase/migrations/0001_init.sql` and **Run**.
   - Creates `products`, `orders`, `testimonials`, `site_content`, `admin_settings`.
   - Enables **RLS**: public can only `SELECT` active products/testimonials + site_content.
     `orders` and `admin_settings` have **no public policies** (service-role only).
   - Seeds 1 product (₹1,100 / ₹2,100), 4 testimonials, hero/announcement content.
3. Create the **admin user** → Authentication → Users → *Add user* (email + password,
   auto-confirm). Any authenticated Supabase user is treated as store admin.
   - Use your own email + a strong password here — do not reuse any password that
     was ever committed to source control. Once logged in, you can change both the
     email and password any time from **/admin/account** in the app itself.

Credentials used (already in `.env`):
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` — public, client-safe.
- `SUPABASE_SERVICE_ROLE_KEY` — **server only**, never shipped to the browser
  (verified: not present in `.output/public`).

---

## 2. Razorpay setup (online payments — optional; COD works without it)

Online payment is **admin-toggleable**. Until configured, checkout offers **COD only**.

1. Razorpay Dashboard → **Settings → API Keys** → generate Key ID + Key Secret.
2. Log into the site `/admin` → **Content & Payments** → *Razorpay settings*:
   - paste **Key ID**, **Key Secret**, **Webhook Secret**, tick **enable**, save.
   - (Secrets are stored in `admin_settings`, service-role only, never returned in full.)
   - Alternatively set `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` /
     `RAZORPAY_WEBHOOK_SECRET` in `.env` (admin values take precedence).
3. Razorpay Dashboard → **Webhooks** → add:
   - URL: `https://YOUR-DOMAIN/api/webhook/razorpay`
   - Secret: the same **Webhook Secret**
   - Events: `payment.captured`, `order.paid`
4. Signatures are always verified **server-side**; a client-reported "success" is
   never trusted.

---

## 3. Resend setup (transactional emails)

1. Resend → **API Keys** → create key → set `RESEND_API_KEY` (already set for testing).
2. **Verify a sending domain** and set `RESEND_FROM_EMAIL=orders@yourdomain.com`.
   - Until a domain is verified, the app falls back to `onboarding@resend.dev`,
     which in Resend **sandbox mode only delivers to your own account email**.
3. `ADMIN_ALERT_EMAIL` receives a "new order" alert on every order.

Emails sent: order confirmation, payment confirmation, admin new-order alert,
shipping update (on status → shipped), delivery confirmation (on status → delivered).
All are best-effort — a failed email never blocks an order.

---

## 4. Local run

```bash
bun install
cp .env.example .env      # fill in values
bun run dev               # http://localhost:3000

# Production-style run:
bun run build             # outputs .output/server/index.mjs (node-server preset)
bun run start             # === node .output/server/index.mjs
```

---

## 5. Hostinger Node.js deployment

Hostinger hPanel → **Websites → Node.js**.

> ⚠️ **Critical order-of-operations:** `VITE_*` variables (Supabase URL/anon key)
> are baked into the app **at build time**, not read at server start. If `.env`
> is missing or incomplete when `npm run build` runs, every page will fail with
> a 500 error at runtime — even if you add the env vars afterward and only
> restart the server. Always create/upload `.env` **before** running the build
> command, and re-run the build any time a `VITE_*` value changes.

1. **Node version:** 20 LTS or newer (a `ws` WebSocket polyfill is bundled so
   Supabase realtime works on Node 20; Node 22+ works natively).
2. Upload the repo (Git deploy or file manager). Create `.env` in the app root
   **first** (from `.env.example`, filled with real values) — before building.
   If hPanel's environment-variables section is used instead of a committed
   `.env` file, make sure those variables are set **before** the build step
   runs, not only before start.
3. **Build command:** `npm install && npm run build`   (or `bun install && bun run build`)
4. **Start / entry file:** `.output/server/index.mjs`
   - App start command: `node .output/server/index.mjs`
   - The server reads `PORT` and `HOST` from the environment (hPanel sets these).
5. **PM2 (recommended for keep-alive):**
   ```bash
   npm run build
   pm2 start ecosystem.config.cjs
   pm2 save && pm2 startup
   ```
6. **Domain + SSL:** point your domain to the Node app in hPanel and enable the
   free SSL certificate. Set `SITE_URL=https://your-domain` (used in email links).
7. **Verify after every deploy:** open `/`, `/checkout`, and `/admin/login` in a
   browser. A 500 on all three almost always means `.env` wasn't present at
   build time — re-run the build with `.env` in place and restart.

### Env vars on Hostinger
Set every key from `.env.example`. Only the `VITE_*` ones reach the browser;
`SUPABASE_SERVICE_ROLE_KEY`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`,
`RESEND_API_KEY` stay server-side.

---

## 6. Go-live checklist

- [ ] Ran `supabase/migrations/0001_init.sql` in the Supabase SQL Editor
- [ ] Created a real admin user with your own email + a strong, unique password
- [ ] Set all `.env` values on Hostinger (or committed nothing secret — `.env` is gitignored)
- [ ] Verified `bun run build` produces `.output/server/index.mjs`
- [ ] `node .output/server/index.mjs` boots and serves `/`
- [ ] (If using online payments) added Razorpay keys in `/admin` + webhook in Razorpay
- [ ] Verified a verified Resend sending domain for real customer emails
- [ ] Placed a COD test order → appears in `/admin/orders`, admin alert email received
- [ ] Domain + SSL bound, `SITE_URL` set to the live https domain
- [ ] Confirmed no git history rewrite on the Lovable-connected branch (forward commits only)

---

## 7. Security summary

- Service role / Razorpay / Resend secrets are imported **only** inside
  `*.server.ts` modules and `src/routes/api/**` — verified absent from the client bundle.
- Order price is always **re-fetched server-side**; client-sent prices are ignored.
- Razorpay signatures verified server-side (payment + webhook, timing-safe compare).
- Order and payment endpoints are rate-limited per IP.
- Admin API routes verify the Supabase Auth token **on every request**
  (`requireAdmin`), not just by hiding UI.

# Diamond House — E-commerce PRD

## Problem statement
Extend the existing Lovable-generated TanStack Start landing page (`divine-landing-page`,
React 19 + TanStack Router + Vite + Nitro, repo at github.com/diamondhousekop-sketch/divine-landing-page)
into a full production e-commerce system with Supabase backend, Razorpay (COD + online)
payments, Resend emails, and a fully controllable admin panel — deployable on Hostinger
Node.js hosting. Must NOT rewrite git history on the Lovable-connected branch.

Working dir: `/app/divine-landing-page` (self-contained repo, deploys to Hostinger — NOT Emergent supervisor).

## Stack (unchanged base)
TanStack Start 1.168 + Router 1.170, Vite 8, React 19, TS, Tailwind v4, shadcn/Radix,
react-hook-form + zod, bun. Design tokens in src/styles.css (ivory/maroon/gold/navy) reused.
Added: @supabase/supabase-js, razorpay, resend, ws (Node<22 WebSocket polyfill).

## Architecture
- Public reads via anon Supabase client + RLS (products/testimonials/site_content).
- Writes via TanStack Start server routes (src/routes/api/**) using service-role client.
- Admin auth = Supabase Auth email/password; server routes re-verify JWT via requireAdmin().
- Razorpay creds stored in admin_settings (service-role only), editable in /admin.
- Nitro preset overridden to node-server → .output/server/index.mjs.

## Implemented (2026-06)
- Supabase clients (browser + server), SQL migration (0001_init.sql) w/ RLS + seed.
- Server APIs: orders, config, payment/create, payment/verify, webhook/razorpay,
  admin/{orders,products,testimonials,content,settings}.
- Pages: /checkout, /order-confirmation, /admin/login, /admin (dashboard+chart),
  /admin/orders (table+mobile cards+status), /admin/products, /admin/testimonials, /admin/content.
- index.tsx now DB-driven (product price, testimonials, hero/announcement content) with fallbacks;
  CTAs → /checkout.
- Resend bilingual email templates (order/payment/admin-alert/shipping/delivery).
- Rate limiting on order/payment endpoints. Signature verification server-side.
- DEPLOYMENT.md (Supabase/Razorpay/Resend + Hostinger PM2 + go-live checklist), ecosystem.config.cjs.

## Verified
- `bun run build` OK → node-server output. No secrets in client bundle (grep-verified).
- `node .output/server/index.mjs` boots; `/`, `/checkout`, `/admin/login`, `/order-confirmation`,
  `/api/config` all 200. Order API returns graceful error pre-migration.
- Landing + checkout screenshots confirm brand-consistent UI.
- Supabase auth reachable; demo admin user created.

## KNOWN REQUIRED MANUAL STEP (blocker for full e2e)
Supabase schema NOT yet applied — only the service_role JWT was provided (no DB password /
management token), which cannot run DDL. User MUST run `supabase/migrations/0001_init.sql`
in the Supabase SQL Editor. After that, checkout + admin data flows are fully functional.

## Backlog / next
- P1: Product image upload (currently images use bundled assets; DB `images` jsonb ready).
- P2: Coupon/discount codes; multiple products/catalog; inventory decrement on paid order.
- P2: Vimeo testimonial video embeds (schema field exists, UI plays placeholder).
- P2: Per-page (not just site-wide) SEO meta title/description.

## Funnel completion (2026-06) — added on top of the above
- PRIORITY 1 (post-payment): rich online-payment success journey already live in
  `/order-confirmation` (founder video from `content.founder_video_url`, summary card,
  "पुढे काय होणार?" stepper, WhatsApp CTA, Purchase pixel/GA4 event). COD keeps simple summary.
- PRIORITY 2 (tracking): `/track` public page + `/api/track` (order number + phone verified).
- PRIORITY 3 (invoice): `src/lib/invoice.server.ts` — branded maroon/gold PDF via `pdf-lib`
  (English doc, "Rs.", deterministic sequential number `DH-YYYY-NNNNN`, no DB column/DDL).
  Auto-emailed on online payment (verify.ts) + on COD "confirmed" (admin/orders PATCH).
  Admin Orders: WhatsApp deep-link, invoice download (`GET /api/admin/invoice`), re-send
  (`POST /api/admin/invoice`), CSV export.
- PRIORITY 4 (marketing): Admin → Integrations (`/admin/integrations`, `/api/admin/store-settings`)
  for Meta Pixel / GA4 / GTM / GSC (stored in admin_settings `marketing`, surfaced via `/api/config`,
  injected in `lib/analytics.ts`). Events: PageView, ViewContent (home), InitiateCheckout, Purchase.
- PRIORITY 5 (legal): `/privacy-policy`, `/terms-and-conditions`, `/refund-and-cancellation-policy`,
  `/shipping-policy`, `/contact-us` — content editable via Admin → Content (site_content keys),
  footer links site-wide. Defs in `src/lib/legal.ts`, shell in `src/components/LegalPage.tsx`.
- PRIORITY 6 (admin gaps): dashboard pending-COD + low-stock flag; CSV export; server-side
  out-of-stock rejection in `/api/orders`; testimonial moderation (is_active) already present;
  site-wide SEO/OG meta injection in `__root.tsx` (site_content `seo_title/seo_description/og_image`);
  favicon present.
- COD toggle: admin_settings `checkout.cod_enabled` (default TRUE — NOT flipped off); editable in
  Admin → Integrations; enforced in checkout UI + `/api/orders`. Online payment untouched.
- Verified: `bunx tsc --noEmit` clean, `bun run build` OK (node-server), SSR 200 on all new routes,
  `/api/config` returns marketing+cod flags, invoice PDF generation runtime-tested, no secrets in
  client bundle (grep-verified). NOTE: DB schema 0001 already applied on the live project; new
  settings keys are created lazily via PostgREST upserts (no DDL needed).


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
- P1: Order detail view + invoice/receipt PDF.
- P2: Coupon/discount codes; multiple products/catalog; inventory decrement on paid order.
- P2: Vimeo testimonial video embeds (schema field exists, UI plays placeholder).

# Test Credentials — Diamond House

App working dir: `/app/divine-landing-page` (TanStack Start, deploys to Hostinger).
Local prod run: `bun run build && node .output/server/index.mjs` (PORT=3000).

## Admin panel (Supabase Auth)
- URL: `/admin/login`
- Email: `admin@diamondhouse.in`
- Password: `DiamondHouse@2026`
(Created via Supabase service-role admin API. Change before go-live.)

## Supabase project
- URL: https://wxjrundlsyzfmzooeeju.supabase.co
- Anon + service-role keys are in `/app/divine-landing-page/.env`.
- ⚠️ Schema migration `supabase/migrations/0001_init.sql` must be run in the Supabase
  SQL Editor before checkout/admin data flows work (DDL cannot be applied via the JWT).

## Razorpay
- Not configured (placeholders). Online payment disabled until keys are added in
  /admin → Content & Payments. COD works without Razorpay.

## Resend
- API key in .env. From = onboarding@resend.dev (sandbox: delivers only to account owner
  until a domain is verified). Admin alert email: samfonde0@gmail.com.

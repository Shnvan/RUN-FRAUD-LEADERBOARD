# Purchase Record

Buyer-reported purchase records for one unnamed marketplace. Public totals include **approved** purchases only. Moderation approval makes a report eligible for publication; it does not independently verify a sale.

The public homepage is an editorial dashboard with approved platform totals, three seller leaderboards, recent purchases, seller search, and an accessible purchase-recording modal. Rankings describe reported exposure only and never claim fraud, profit, or complete revenue.

## Local setup

1. Run `npm ci`.
2. Create a Supabase project. Apply `supabase/001_initial.sql`, `supabase/002_public_views.sql`, and `supabase/003_moderation.sql` in order. The optional `supabase/verify.sql` checks calculations inside a rolled-back transaction.
3. Create a **private** Supabase Storage bucket named `private-evidence`. Restrict it to JPG, PNG, and WebP, with a 5 MB file limit. Do not add public download policies.
4. Create Cloudflare Turnstile site and secret keys for the deployed hostname.
5. Copy `.env.example` to `.env.local` and fill in all values. Keep the service role key, Turnstile secret, and abuse hash secret out of source control. `ADMIN_EMAILS` is a comma-separated allowlist of ChatGPT sign-in email addresses.
6. Run `npm run dev`. The app fails closed when the database, challenge keys, or abuse secret are absent.

The service role key is used only by server routes. Direct browser table access is denied by RLS. The admin route is `/admin` and requires both ChatGPT sign-in and an email on the allowlist. It is intentionally absent from public navigation.

## Checks

Run `npx tsc --noEmit` and `npm run build`. After configuring Supabase, run `supabase/verify.sql` in a test project and exercise purchase submission, moderation, correction, seller merge, and evidence review before public launch.

The app stores a keyed hash of the request IP and user agent for rate limiting and abuse review. It does not publish buyer identity or evidence. Do not use a test Turnstile key or an example secret in production.

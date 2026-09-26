# fraus security operations

## Required production settings

1. Apply `supabase/006_security_hardening.sql` before deploying this version.
2. In Supabase Authentication, disable public signup, anonymous users, email OTP/magic-link login, and every unused provider. Keep password and TOTP enabled.
3. Set a password of at least 16 random characters for each allowlisted administrator. Enroll two TOTP factors on separate devices through `/admin`.
4. Add `CRON_SECRET` to Vercel as a separate random value of at least 32 bytes. Never reuse `ABUSE_HASH_SECRET`.
5. Add these Vercel Firewall rules:
   - Rate limit POST requests to `/api/loss-reports` and `/api/corrections` to 10 requests per 10 minutes per IP.
   - Rate limit `/api/auth/*` to 20 requests per 10 minutes per IP.
   - Deny non-GET/POST methods and requests larger than the application limits on `/api/*` where the Firewall UI supports those conditions.
6. Enable GitHub secret scanning, push protection, branch protection, required CI/CodeQL checks, and Dependabot security updates.

## Backups

Generate an age key locally and keep the private key offline. Put only the public recipient in the GitHub variable `BACKUP_AGE_RECIPIENT`. Add `SUPABASE_DB_PASSWORD`, `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, and `SUPABASE_EVIDENCE_BUCKET` as GitHub Actions secrets. The workflow passes the database password through `PGPASSWORD`, so passwords containing URI-reserved characters do not require encoding. Run the backup workflow manually once, decrypt it locally, restore the database into a disposable project, and inspect the evidence manifest before enabling its weekly schedule. Keep one encrypted monthly copy outside GitHub.

## Release gates

- `npm audit --omit=dev --audit-level=high` reports no high or critical vulnerabilities.
- Type checking, lint, tests, the Vercel production build, and CodeQL pass.
- A full-history secret scan finds no live credential. If it does, rotate the credential before rewriting or publishing history.
- Verify login, TOTP, step-up expiry, global sign-out, evidence authorization, duplicate detection, rate limits, retention, and backup restoration on a preview deployment.
- Run OWASP ZAP baseline against the preview URL only.

## Residual CSP item

The current vinext runtime still needs inline bootstrap scripts, so `script-src 'unsafe-inline'` remains temporarily. Authentication is now same-origin and the rest of the policy remains restrictive. Remove this directive after a vinext release passes a request-nonce production build and Turnstile regression test.

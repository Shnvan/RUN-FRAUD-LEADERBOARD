# Dark profiles rollout

1. Run `supabase/008_profiles_and_account_types.sql` in the production Supabase SQL editor.
2. Run `supabase/verify_profiles.sql` and confirm it completes without an exception.
3. Add `SUPABASE_SELLER_IMAGE_BUCKET=seller-profile-images` to Vercel Production and Preview.
4. Add a GitHub Actions secret named `SUPABASE_SELLER_IMAGE_BUCKET` with the same value.
5. Deploy the application.
6. Smoke-test dark and light themes, a report with multiple account types, moderator account-type correction, seller image upload/replacement/removal, suspended-seller image denial, and public displays.
7. Run `supabase/009_remove_legacy_loss_rpc.sql` only after the v2 submission smoke test succeeds.
8. Run the encrypted backup workflow and confirm both `evidence/manifest.json` and `seller-images/manifest.json` are present.

The application deliberately expects the database migration before deployment. Existing rows remain valid with no account-type labels or seller image.
## Hall metrics before merge

1. Apply `supabase/010_hall_metrics.sql` after migration `008`.
2. Run `supabase/verify_profiles.sql` and `supabase/verify_hall.sql`.
3. Confirm `get_public_overview` returns `reported_purchase_value` and `accounts_reported_purchased` in both `totals` and every leader row.
4. Deploy the application and verify the hall, leaderboard, and seller profile totals against approved open reports.

-- Remove direct PostgREST access to private tables and views.
-- Public data remains available only through the approved security-definer RPCs.

revoke all on table
  public.sellers,
  public.purchases,
  public.submission_events,
  public.blocked_fingerprints,
  public.correction_requests,
  public.moderation_audit,
  public.security_events
from public, anon, authenticated;

revoke all on table
  public.seller_statistics,
  public.public_purchase_rows,
  public.platform_statistics,
  public.seller_loss_statistics,
  public.public_loss_rows,
  public.platform_loss_statistics
from public, anon, authenticated;

grant select, insert, update, delete on table
  public.sellers,
  public.purchases,
  public.submission_events,
  public.blocked_fingerprints,
  public.correction_requests,
  public.moderation_audit,
  public.security_events
to service_role;

grant select on table
  public.seller_statistics,
  public.public_purchase_rows,
  public.platform_statistics,
  public.seller_loss_statistics,
  public.public_loss_rows,
  public.platform_loss_statistics
to service_role;

revoke all on all sequences in schema public from public, anon, authenticated;
grant usage, select on all sequences in schema public to service_role;

alter default privileges in schema public revoke all on tables from public, anon, authenticated;
alter default privileges in schema public revoke all on sequences from public, anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;

-- The only anonymous API surface is the approved, aggregate-only RPC set.
grant execute on function
  public.get_public_overview(),
  public.get_public_records(),
  public.search_public_sellers(text),
  public.get_public_seller(text),
  public.get_public_record(uuid)
to anon, service_role;

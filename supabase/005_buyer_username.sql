-- Run after 004_loss_reports.sql. Historical records keep a null buyer username.
alter table public.purchases add column buyer_username text
  check (length(btrim(buyer_username)) between 2 and 64 and buyer_username !~ '[[:cntrl:]<>]');

create or replace function public.submit_loss_report_with_buyer(
  p_handle text, p_buyer_username text, p_date date, p_quantity integer, p_unit_price numeric,
  p_unresolved_amount numeric, p_issue text, p_details text,
  p_idempotency uuid, p_fingerprint text, p_duplicate_key text, p_evidence_path text default null
) returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid; v_buyer_username text:=btrim(p_buyer_username);
begin
  if v_buyer_username is null or length(v_buyer_username) not between 2 and 64
    or v_buyer_username ~ '[[:cntrl:]<>]' then raise exception 'invalid_buyer_username'; end if;
  v_id:=public.submit_loss_report(p_handle,p_date,p_quantity,p_unit_price,p_unresolved_amount,
    p_issue,p_details,p_idempotency,p_fingerprint,p_duplicate_key,p_evidence_path);
  update public.purchases set buyer_username=v_buyer_username
    where id=v_id and loss_issue is not null and buyer_username is null;
  return v_id;
end $$;

revoke all on function public.submit_loss_report(text,date,integer,numeric,numeric,text,text,uuid,text,text,text) from service_role;
revoke all on function public.submit_loss_report_with_buyer(text,text,date,integer,numeric,numeric,text,text,uuid,text,text,text)
  from public,anon,authenticated;
grant execute on function public.submit_loss_report_with_buyer(text,text,date,integer,numeric,numeric,text,text,uuid,text,text,text)
  to service_role;

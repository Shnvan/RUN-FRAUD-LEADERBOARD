-- Run after 001_initial.sql, 002_public_views.sql, and 003_moderation.sql.
alter table public.purchases
  add column loss_issue text check (loss_issue in ('not_delivered','refund_not_received','other_unresolved')),
  add column loss_details text check (length(loss_details) between 10 and 500),
  add column reported_unresolved_amount numeric(16,2),
  add column unresolved_amount numeric(16,2),
  add column loss_status text check (loss_status in ('open','resolved')),
  add constraint loss_report_complete check (
    (loss_issue is null and loss_details is null and reported_unresolved_amount is null and unresolved_amount is null and loss_status is null)
    or (loss_issue is not null and loss_details is not null and reported_unresolved_amount > 0
      and reported_unresolved_amount <= quantity * unit_price and unresolved_amount >= 0
      and unresolved_amount <= reported_unresolved_amount and loss_status is not null
      and ((loss_status = 'open' and unresolved_amount > 0) or (loss_status = 'resolved' and unresolved_amount = 0)))
  );

create index purchases_public_losses on public.purchases(seller_id,created_at desc,id desc)
  where moderation_status='approved' and loss_status='open';

alter table public.correction_requests drop constraint if exists correction_requests_issue_type_check;
alter table public.correction_requests add constraint correction_requests_issue_type_check
  check (issue_type in ('wrong_seller','wrong_amount','duplicate','not_a_purchase','refund_received','loss_resolved','other'));

create or replace function public.submit_loss_report(
  p_handle text, p_date date, p_quantity integer, p_unit_price numeric,
  p_unresolved_amount numeric, p_issue text, p_details text,
  p_idempotency uuid, p_fingerprint text, p_duplicate_key text, p_evidence_path text default null
) returns uuid language plpgsql security definer set search_path=public as $$
declare v_handle text; v_seller uuid; v_id uuid; v_flags text[] := '{}'; v_status text; v_target uuid;
begin
  v_handle := lower(regexp_replace(trim(p_handle), '^@+', ''));
  if v_handle !~ '^[a-z0-9._-]{2,64}$' then raise exception 'invalid_handle'; end if;
  if p_date is null or p_date > (now() at time zone 'Asia/Manila')::date or p_date < date '2000-01-01' then raise exception 'invalid_date'; end if;
  if p_quantity is null or p_quantity not between 1 and 10000 then raise exception 'invalid_quantity'; end if;
  if p_unit_price is null or p_unit_price not between 0.01 and 1000000 or p_unit_price <> round(p_unit_price,2) then raise exception 'invalid_price'; end if;
  if p_unresolved_amount is null or p_unresolved_amount <= 0 or p_unresolved_amount > p_quantity * p_unit_price
    or p_unresolved_amount <> round(p_unresolved_amount,2) then raise exception 'invalid_unresolved_amount'; end if;
  if p_issue not in ('not_delivered','refund_not_received','other_unresolved') then raise exception 'invalid_issue'; end if;
  if length(coalesce(trim(p_details),'')) not between 10 and 500 then raise exception 'invalid_details'; end if;
  if p_fingerprint is null or length(p_fingerprint) <> 64 or p_duplicate_key is null or length(p_duplicate_key) <> 64 then raise exception 'invalid_fingerprint'; end if;
  if exists(select 1 from public.blocked_fingerprints where fingerprint=p_fingerprint) then raise exception 'rate_limited'; end if;
  select id into v_id from public.purchases where idempotency_key=p_idempotency;
  if v_id is not null then return v_id; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_fingerprint,0));
  delete from public.submission_events where created_at < now() - interval '7 days';
  if (select count(*) from public.submission_events where fingerprint=p_fingerprint and kind='purchase' and created_at>now()-interval '1 hour')>=5
    or (select count(*) from public.submission_events where fingerprint=p_fingerprint and kind='purchase' and created_at>now()-interval '1 day')>=20
  then raise exception 'rate_limited'; end if;
  insert into public.submission_events(fingerprint,kind) values(p_fingerprint,'purchase');
  insert into public.sellers(username,normalized_username) values(v_handle,v_handle)
    on conflict(normalized_username) do update set updated_at=now() returning id into v_seller;
  select status,merged_into into v_status,v_target from public.sellers where id=v_seller;
  if v_status='suspended' then raise exception 'seller_unavailable'; end if;
  if v_status='merged' then
    v_seller:=v_target;
    select status into v_status from public.sellers where id=v_seller;
    if v_status is null or v_status='suspended' then raise exception 'seller_unavailable'; end if;
  end if;
  if p_quantity>100 then v_flags:=array_append(v_flags,'large_quantity'); end if;
  if p_unit_price>100000 then v_flags:=array_append(v_flags,'high_price'); end if;
  if exists(select 1 from public.purchases where duplicate_key=p_duplicate_key and created_at>now()-interval '30 days')
    then v_flags:=array_append(v_flags,'possible_duplicate'); end if;
  insert into public.purchases(seller_id,purchase_date,quantity,unit_price,loss_issue,loss_details,
    reported_unresolved_amount,unresolved_amount,loss_status,idempotency_key,submitter_fingerprint,duplicate_key,evidence_path,flags)
    values(v_seller,p_date,p_quantity,p_unit_price,p_issue,trim(p_details),p_unresolved_amount,p_unresolved_amount,'open',
      p_idempotency,p_fingerprint,p_duplicate_key,p_evidence_path,v_flags) returning id into v_id;
  return v_id;
end $$;

create or replace function public.submit_correction(p_purchase uuid,p_issue text,p_email text,p_details text,p_fingerprint text)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid;
begin
  if not exists(select 1 from public.purchases where id=p_purchase and moderation_status='approved') then raise exception 'record_unavailable'; end if;
  if p_issue not in ('wrong_seller','wrong_amount','duplicate','not_a_purchase','refund_received','loss_resolved','other') then raise exception 'invalid_issue'; end if;
  if p_email !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or length(p_email)>254 then raise exception 'invalid_email'; end if;
  if length(coalesce(p_details,''))>500 then raise exception 'details_too_long'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_fingerprint,0));
  if (select count(*) from public.submission_events where fingerprint=p_fingerprint and kind='correction' and created_at>now()-interval '1 day')>=5 then raise exception 'rate_limited'; end if;
  insert into public.submission_events(fingerprint,kind) values(p_fingerprint,'correction');
  insert into public.correction_requests(purchase_id,issue_type,contact_email,details)
    values(p_purchase,p_issue,p_email,p_details) returning id into v_id;
  return v_id;
end $$;

create or replace function public.adjust_unresolved_loss(p_id uuid,p_amount numeric,p_actor text)
returns void language plpgsql security definer set search_path=public as $$
declare v_before numeric; v_limit numeric;
begin
  select unresolved_amount,reported_unresolved_amount into v_before,v_limit from public.purchases
    where id=p_id and moderation_status='approved' and loss_issue is not null for update;
  if not found then raise exception 'record_unavailable'; end if;
  if p_amount is null or p_amount<0 or p_amount>v_limit or p_amount<>round(p_amount,2) then raise exception 'invalid_unresolved_amount'; end if;
  update public.purchases set unresolved_amount=p_amount,loss_status=case when p_amount=0 then 'resolved' else 'open' end where id=p_id;
  insert into public.moderation_audit(actor,action,target_type,target_id,detail)
    values(p_actor,case when p_amount=0 then 'resolve_loss' else 'adjust_loss' end,'purchase',p_id,
      jsonb_build_object('before',v_before,'after',p_amount));
end $$;

create or replace view public.seller_loss_statistics as
select s.id,s.username,s.normalized_username,
  coalesce(sum(p.unresolved_amount),0)::numeric(16,2) as unresolved_amount,
  count(p.id)::bigint as report_count
from public.sellers s
join public.purchases p on p.seller_id=s.id and p.moderation_status='approved'
  and p.loss_status='open' and p.unresolved_amount>0
where s.status='active'
group by s.id,s.username,s.normalized_username;

create or replace view public.public_loss_rows as
select p.id,p.seller_id,s.username,s.normalized_username,p.purchase_date,p.quantity,p.unit_price,
  p.total_amount,p.unresolved_amount,p.loss_issue,p.created_at
from public.purchases p join public.sellers s on s.id=p.seller_id
where p.moderation_status='approved' and p.loss_status='open' and p.unresolved_amount>0 and s.status='active';

create or replace view public.platform_loss_statistics as
select coalesce(sum(p.unresolved_amount),0)::numeric(16,2) as unresolved_amount,
  count(p.id)::bigint as report_count,count(distinct p.seller_id)::bigint as visible_sellers
from public.purchases p join public.sellers s on s.id=p.seller_id
where p.moderation_status='approved' and p.loss_status='open' and p.unresolved_amount>0 and s.status='active';

revoke all on function public.submit_loss_report(text,date,integer,numeric,numeric,text,text,uuid,text,text,text) from public,anon,authenticated;
revoke all on function public.adjust_unresolved_loss(uuid,numeric,text) from public,anon,authenticated;
grant execute on function public.submit_loss_report(text,date,integer,numeric,numeric,text,text,uuid,text,text,text) to service_role;
grant execute on function public.adjust_unresolved_loss(uuid,numeric,text) to service_role;
revoke all on public.seller_loss_statistics,public.public_loss_rows,public.platform_loss_statistics from anon,authenticated;
grant select on public.seller_loss_statistics,public.public_loss_rows,public.platform_loss_statistics to service_role;

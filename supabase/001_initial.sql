-- Apply once in the Supabase SQL editor before enabling public submissions.
create extension if not exists pgcrypto;

create table public.sellers (
  id uuid primary key default gen_random_uuid(),
  username text not null,
  normalized_username text not null unique,
  status text not null default 'pending' check (status in ('pending','active','suspended','merged')),
  merged_into uuid references public.sellers(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (length(normalized_username) between 2 and 64)
);
create table public.purchases (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.sellers(id),
  purchase_date date not null,
  quantity integer not null check (quantity between 1 and 10000),
  unit_price numeric(12,2) not null check (unit_price between 0.01 and 1000000),
  total_amount numeric(16,2) generated always as (quantity * unit_price) stored,
  currency text not null default 'PHP' check (currency = 'PHP'),
  moderation_status text not null default 'pending' check (moderation_status in ('pending','approved','rejected')),
  evidence_path text,
  flags text[] not null default '{}',
  idempotency_key uuid not null unique,
  submitter_fingerprint text not null,
  duplicate_key text not null,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by text
);
create index purchases_seller_public on public.purchases(seller_id,purchase_date desc,created_at desc,id desc) where moderation_status = 'approved';
create index purchases_pending on public.purchases(created_at) where moderation_status = 'pending';
create index purchases_duplicate on public.purchases(duplicate_key,created_at desc);
create table public.blocked_fingerprints (
  fingerprint text primary key,
  reason text not null,
  blocked_at timestamptz not null default now(),
  blocked_by text not null
);
create table public.submission_events (
  id bigint generated always as identity primary key,
  fingerprint text not null,
  kind text not null check (kind in ('purchase','correction')),
  created_at timestamptz not null default now()
);
create index submission_events_limit on public.submission_events(fingerprint,kind,created_at desc);
create index submission_events_created_at on public.submission_events(created_at);
create table public.correction_requests (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references public.purchases(id),
  issue_type text not null check (issue_type in ('wrong_seller','wrong_amount','duplicate','not_a_purchase','other')),
  contact_email text not null,
  details text check (length(details) <= 500),
  status text not null default 'open' check (status in ('open','resolved','dismissed')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by text
);
create table public.moderation_audit (
  id bigint generated always as identity primary key,
  actor text not null,
  action text not null,
  target_type text not null,
  target_id uuid,
  target_key text,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.sellers enable row level security;
alter table public.purchases enable row level security;
alter table public.submission_events enable row level security;
alter table public.blocked_fingerprints enable row level security;
alter table public.correction_requests enable row level security;
alter table public.moderation_audit enable row level security;
-- No browser table policies. All queries go through authenticated server routes.

create or replace function public.submit_purchase(
  p_handle text, p_date date, p_quantity integer, p_unit_price numeric,
  p_idempotency uuid, p_fingerprint text, p_duplicate_key text, p_evidence_path text default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_handle text; v_seller uuid; v_id uuid; v_flags text[] := '{}'; v_status text; v_target uuid;
begin
  v_handle := lower(regexp_replace(trim(p_handle), '^@+', ''));
  if v_handle !~ '^[a-z0-9._-]{2,64}$' then raise exception 'invalid_handle'; end if;
  if p_date is null or p_date > (now() at time zone 'Asia/Manila')::date or p_date < date '2000-01-01' then raise exception 'invalid_date'; end if;
  if p_quantity is null or p_quantity not between 1 and 10000 then raise exception 'invalid_quantity'; end if;
  if p_unit_price is null or p_unit_price not between 0.01 and 1000000 or p_unit_price <> round(p_unit_price,2) then raise exception 'invalid_price'; end if;
  if p_fingerprint is null or length(p_fingerprint) <> 64 or p_duplicate_key is null or length(p_duplicate_key) <> 64 then raise exception 'invalid_fingerprint'; end if;
  if exists (select 1 from public.blocked_fingerprints where fingerprint=p_fingerprint) then raise exception 'rate_limited'; end if;
  select id into v_id from public.purchases where idempotency_key = p_idempotency;
  if v_id is not null then return v_id; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_fingerprint,0));
  delete from public.submission_events where created_at < now() - interval '7 days';
  if (select count(*) from public.submission_events where fingerprint = p_fingerprint and kind='purchase' and created_at > now() - interval '1 hour') >= 5
    or (select count(*) from public.submission_events where fingerprint = p_fingerprint and kind='purchase' and created_at > now() - interval '1 day') >= 20
  then raise exception 'rate_limited'; end if;
  insert into public.submission_events(fingerprint,kind) values(p_fingerprint,'purchase');
  insert into public.sellers(username,normalized_username) values(v_handle,v_handle)
    on conflict (normalized_username) do update set updated_at = now()
    returning id into v_seller;
  select status,merged_into into v_status,v_target from public.sellers where id=v_seller;
  if v_status='suspended' then raise exception 'seller_unavailable'; end if;
  if v_status='merged' then v_seller:=v_target; end if;
  if p_quantity > 100 then v_flags := array_append(v_flags,'large_quantity'); end if;
  if p_unit_price > 100000 then v_flags := array_append(v_flags,'high_price'); end if;
  if exists (select 1 from public.purchases where duplicate_key = p_duplicate_key and created_at > now() - interval '30 days') then v_flags := array_append(v_flags,'possible_duplicate'); end if;
  insert into public.purchases(seller_id,purchase_date,quantity,unit_price,idempotency_key,submitter_fingerprint,duplicate_key,evidence_path,flags)
    values(v_seller,p_date,p_quantity,p_unit_price,p_idempotency,p_fingerprint,p_duplicate_key,p_evidence_path,v_flags)
    returning id into v_id;
  return v_id;
end $$;

create or replace function public.review_purchase(p_id uuid,p_decision text,p_actor text)
returns void language plpgsql security definer set search_path = public as $$
declare v_seller uuid;
begin
  if p_decision not in ('approved','rejected') then raise exception 'invalid_decision'; end if;
  update public.purchases set moderation_status=p_decision,reviewed_at=now(),reviewed_by=p_actor
    where id=p_id and moderation_status='pending' returning seller_id into v_seller;
  if v_seller is null then raise exception 'not_pending'; end if;
  if p_decision='approved' then update public.sellers set status='active',updated_at=now() where id=v_seller and status='pending'; end if;
  insert into public.moderation_audit(actor,action,target_type,target_id) values(p_actor,p_decision,'purchase',p_id);
end $$;

create or replace function public.merge_sellers(p_source uuid,p_target uuid,p_actor text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_source=p_target then raise exception 'same_seller'; end if;
  if not exists(select 1 from public.sellers where id=p_source and status <> 'merged')
    or not exists(select 1 from public.sellers where id=p_target and status='active') then raise exception 'seller_unavailable'; end if;
  update public.purchases set seller_id=p_target where seller_id=p_source;
  update public.sellers set status='merged',merged_into=p_target,updated_at=now() where id=p_source;
  insert into public.moderation_audit(actor,action,target_type,target_id,detail)
    values(p_actor,'merge','seller',p_source,jsonb_build_object('target',p_target));
end $$;

create or replace function public.submit_correction(p_purchase uuid,p_issue text,p_email text,p_details text,p_fingerprint text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not exists(select 1 from public.purchases where id=p_purchase and moderation_status='approved') then raise exception 'record_unavailable'; end if;
  if p_issue not in ('wrong_seller','wrong_amount','duplicate','not_a_purchase','other') then raise exception 'invalid_issue'; end if;
  if p_email !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or length(p_email)>254 then raise exception 'invalid_email'; end if;
  if length(coalesce(p_details,''))>500 then raise exception 'details_too_long'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_fingerprint,0));
  if (select count(*) from public.submission_events where fingerprint=p_fingerprint and kind='correction' and created_at > now()-interval '1 day')>=5 then raise exception 'rate_limited'; end if;
  insert into public.submission_events(fingerprint,kind) values(p_fingerprint,'correction');
  insert into public.correction_requests(purchase_id,issue_type,contact_email,details) values(p_purchase,p_issue,p_email,p_details) returning id into v_id;
  return v_id;
end $$;

revoke all on function public.submit_purchase(text,date,integer,numeric,uuid,text,text,text) from public,anon,authenticated;
revoke all on function public.review_purchase(uuid,text,text) from public,anon,authenticated;
revoke all on function public.merge_sellers(uuid,uuid,text) from public,anon,authenticated;
revoke all on function public.submit_correction(uuid,text,text,text,text) from public,anon,authenticated;
grant execute on function public.submit_purchase(text,date,integer,numeric,uuid,text,text,text) to service_role;
grant execute on function public.review_purchase(uuid,text,text) to service_role;
grant execute on function public.merge_sellers(uuid,uuid,text) to service_role;
grant execute on function public.submit_correction(uuid,text,text,text,text) to service_role;

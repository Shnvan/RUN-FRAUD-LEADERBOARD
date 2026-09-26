-- Apply after 005_buyer_username.sql, before deploying the security-hardened application.
-- This migration is intentionally fail-closed: the new routes depend on these RPCs.

alter table public.purchases
  add column if not exists evidence_sanitized boolean not null default false,
  add column if not exists linked_duplicate_id uuid references public.purchases(id),
  add column if not exists moderation_reason text check (moderation_reason is null or length(moderation_reason) between 3 and 500),
  add column if not exists private_purge_after timestamptz,
  add column if not exists private_purged_at timestamptz;

alter table public.correction_requests
  add column if not exists idempotency_key uuid,
  add column if not exists submitter_fingerprint text,
  add column if not exists content_fingerprint text,
  add column if not exists private_purge_after timestamptz,
  add column if not exists private_purged_at timestamptz;
create unique index if not exists correction_requests_idempotency on public.correction_requests(idempotency_key) where idempotency_key is not null;
create index if not exists correction_requests_content on public.correction_requests(content_fingerprint,created_at desc);

alter table public.submission_events drop constraint if exists submission_events_kind_check;
alter table public.submission_events add constraint submission_events_kind_check check (kind in ('purchase','correction','password','mfa'));
alter table public.submission_events
  add column if not exists seller_key text,
  add column if not exists content_fingerprint text,
  add column if not exists idempotency_key uuid,
  add column if not exists flags text[] not null default '{}';
create index if not exists submission_events_seller on public.submission_events(seller_key,kind,created_at desc);
create index if not exists submission_events_global on public.submission_events(kind,created_at desc);
create unique index if not exists submission_events_idempotency on public.submission_events(idempotency_key) where idempotency_key is not null;

alter table public.moderation_audit
  add column if not exists actor_id uuid,
  add column if not exists session_id uuid,
  add column if not exists request_id text,
  add column if not exists reason text;

create table if not exists public.security_events (
  id bigint generated always as identity primary key,
  event_type text not null,
  outcome text not null,
  fingerprint text,
  request_id text,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists security_events_created on public.security_events(created_at desc);
alter table public.security_events enable row level security;
revoke all on public.security_events from public,anon,authenticated;
grant select on public.security_events to service_role;

create or replace function public.log_security_event(p_event_type text,p_outcome text,p_fingerprint text,p_request_id text,p_detail jsonb)
returns void language plpgsql security definer set search_path=pg_catalog,public as $$
begin if length(coalesce(p_event_type,'')) not between 1 and 80 or length(coalesce(p_outcome,'')) not between 1 and 40 then raise exception 'invalid_security_event';end if;if p_fingerprint is not null and p_fingerprint !~ '^[0-9a-f]{64}$' then raise exception 'invalid_fingerprint';end if;insert into public.security_events(event_type,outcome,fingerprint,request_id,detail) values(p_event_type,p_outcome,p_fingerprint,left(p_request_id,200),coalesce(p_detail,'{}'));end $$;

create or replace function public.reserve_auth_attempt(p_fingerprint text,p_kind text)
returns void language plpgsql security definer set search_path=pg_catalog,public as $$
declare v_limit integer; v_window interval;
begin
  if p_fingerprint !~ '^[0-9a-f]{64}$' or p_kind not in ('password','mfa') then raise exception 'invalid_security_event'; end if;
  v_limit:=case when p_kind='password' then 10 else 15 end;
  v_window:=case when p_kind='password' then interval '15 minutes' else interval '1 minute' end;
  perform pg_advisory_xact_lock(hashtextextended(p_fingerprint||p_kind,0));
  if (select count(*) from public.submission_events where fingerprint=p_fingerprint and kind=p_kind and created_at>now()-v_window)>=v_limit then raise exception 'rate_limited'; end if;
  insert into public.submission_events(fingerprint,kind) values(p_fingerprint,p_kind);
end $$;

create or replace function public.reserve_loss_submission(
  p_fingerprint text,p_content_fingerprint text,p_seller_key text,p_idempotency uuid
) returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare v_existing uuid; v_flags text[]:='{}'; v_reserved_at timestamptz; v_seller text:=lower(regexp_replace(trim(p_seller_key),'^@+',''));
begin
  if p_fingerprint !~ '^[0-9a-f]{64}$' or p_content_fingerprint !~ '^[0-9a-f]{64}$' or p_idempotency is null then raise exception 'invalid_fingerprint'; end if;
  if v_seller !~ '^[a-z0-9._-]{2,64}$' then raise exception 'invalid_handle'; end if;
  select id into v_existing from public.purchases where idempotency_key=p_idempotency;
  if v_existing is not null then return jsonb_build_object('existing_id',v_existing,'flags','[]'::jsonb,'proceed',false); end if;
  perform pg_advisory_xact_lock(hashtextextended('global-submission-rate',0));
  select flags,created_at into v_flags,v_reserved_at from public.submission_events where idempotency_key=p_idempotency and kind='purchase' limit 1 for update;
  if found then
    if v_reserved_at>now()-interval '2 minutes' then return jsonb_build_object('existing_id',null,'flags',to_jsonb(coalesce(v_flags,'{}')),'proceed',false); end if;
    update public.submission_events set fingerprint=p_fingerprint,created_at=now() where idempotency_key=p_idempotency;
    return jsonb_build_object('existing_id',null,'flags',to_jsonb(coalesce(v_flags,'{}')),'proceed',true);
  end if;
  if exists(select 1 from public.blocked_fingerprints where fingerprint=p_fingerprint) then raise exception 'rate_limited'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_fingerprint,0));
  perform pg_advisory_xact_lock(hashtextextended('seller|'||v_seller,0));
  if (select count(*) from public.submission_events where fingerprint=p_fingerprint and kind='purchase' and created_at>now()-interval '1 hour')>=3
    or (select count(*) from public.submission_events where fingerprint=p_fingerprint and kind='purchase' and created_at>now()-interval '1 day')>=10
  then raise exception 'rate_limited'; end if;
  if (select count(*) from public.submission_events where kind in ('purchase','correction') and created_at>now()-interval '1 hour')>=50 then raise exception 'circuit_open'; end if;
  if exists(select 1 from public.purchases where duplicate_key=p_content_fingerprint and created_at>now()-interval '30 days') then v_flags:=array_append(v_flags,'exact_duplicate'); end if;
  if (select count(*) from public.submission_events where seller_key=v_seller and kind='purchase' and created_at>now()-interval '1 hour')>=5 then v_flags:=array_append(v_flags,'seller_burst'); end if;
  insert into public.submission_events(fingerprint,kind,seller_key,content_fingerprint,idempotency_key,flags)
    values(p_fingerprint,'purchase',v_seller,p_content_fingerprint,p_idempotency,v_flags);
  return jsonb_build_object('existing_id',null,'flags',to_jsonb(v_flags),'proceed',true);
end $$;

create or replace function public.submit_loss_report_secure(
  p_handle text,p_buyer_username text,p_date date,p_quantity integer,p_unit_price numeric,
  p_unresolved_amount numeric,p_issue text,p_details text,p_idempotency uuid,p_fingerprint text,
  p_duplicate_key text,p_evidence_path text default null,p_evidence_sanitized boolean default false
) returns uuid language plpgsql security definer set search_path=pg_catalog,public as $$
declare v_handle text:=lower(regexp_replace(trim(p_handle),'^@+',''));v_buyer text:=btrim(p_buyer_username);v_seller uuid;v_id uuid;v_flags text[]:='{}';v_status text;v_target uuid;v_duplicate uuid;
begin
  select id into v_id from public.purchases where idempotency_key=p_idempotency;if v_id is not null then return v_id;end if;
  if not exists(select 1 from public.submission_events where fingerprint=p_fingerprint and idempotency_key=p_idempotency and kind='purchase' and created_at>now()-interval '15 minutes') then raise exception 'rate_limited';end if;
  if v_handle !~ '^[a-z0-9._-]{2,64}$' then raise exception 'invalid_handle';end if;
  if v_buyer is null or length(v_buyer) not between 2 and 64 or v_buyer ~ '[[:cntrl:]<>]' then raise exception 'invalid_buyer_username';end if;
  if p_date is null or p_date>(now() at time zone 'Asia/Manila')::date or p_date<date '2000-01-01' then raise exception 'invalid_date';end if;
  if p_quantity is null or p_quantity not between 1 and 10000 then raise exception 'invalid_quantity';end if;
  if p_unit_price is null or p_unit_price not between 0.01 and 1000000 or p_unit_price<>round(p_unit_price,2) then raise exception 'invalid_price';end if;
  if p_unresolved_amount is null or p_unresolved_amount<=0 or p_unresolved_amount>p_quantity*p_unit_price or p_unresolved_amount<>round(p_unresolved_amount,2) then raise exception 'invalid_unresolved_amount';end if;
  if p_issue not in ('not_delivered','refund_not_received','other_unresolved') then raise exception 'invalid_issue';end if;
  if length(coalesce(trim(p_details),'')) not between 10 and 500 then raise exception 'invalid_details';end if;
  if p_fingerprint !~ '^[0-9a-f]{64}$' or p_duplicate_key !~ '^[0-9a-f]{64}$' then raise exception 'invalid_fingerprint';end if;
  if p_evidence_path is not null and (not p_evidence_sanitized or p_evidence_path !~ '^[0-9a-f-]{36}\.webp$') then raise exception 'invalid_evidence';end if;
  select flags into v_flags from public.submission_events where idempotency_key=p_idempotency and kind='purchase' order by created_at desc limit 1;
  if p_quantity>100 then v_flags:=array_append(v_flags,'large_quantity');end if;if p_unit_price>100000 then v_flags:=array_append(v_flags,'high_price');end if;
  select id into v_duplicate from public.purchases where duplicate_key=p_duplicate_key and created_at>now()-interval '30 days' order by created_at desc limit 1;
  if v_duplicate is not null and not ('exact_duplicate'=any(v_flags)) then v_flags:=array_append(v_flags,'exact_duplicate');end if;
  insert into public.sellers(username,normalized_username) values(v_handle,v_handle) on conflict(normalized_username) do update set updated_at=now() returning id into v_seller;
  select status,merged_into into v_status,v_target from public.sellers where id=v_seller;if v_status='suspended' then raise exception 'seller_unavailable';end if;if v_status='merged' then v_seller:=v_target;end if;
  insert into public.purchases(seller_id,buyer_username,purchase_date,quantity,unit_price,loss_issue,loss_details,reported_unresolved_amount,unresolved_amount,loss_status,idempotency_key,submitter_fingerprint,duplicate_key,evidence_path,evidence_sanitized,linked_duplicate_id,flags)
  values(v_seller,v_buyer,p_date,p_quantity,p_unit_price,p_issue,trim(p_details),p_unresolved_amount,p_unresolved_amount,'open',p_idempotency,p_fingerprint,p_duplicate_key,p_evidence_path,p_evidence_sanitized,v_duplicate,coalesce(v_flags,'{}')) returning id into v_id;
  return v_id;
end $$;

create or replace function public.submit_correction_secure(
  p_purchase uuid,p_issue text,p_email text,p_details text,p_fingerprint text,p_content_fingerprint text,p_idempotency uuid
) returns uuid language plpgsql security definer set search_path=pg_catalog,public as $$
declare v_id uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_idempotency::text,0));
  select id into v_id from public.correction_requests where idempotency_key=p_idempotency;if v_id is not null then return v_id;end if;
  if not exists(select 1 from public.purchases where id=p_purchase and moderation_status='approved') then raise exception 'record_unavailable';end if;
  if p_issue not in ('wrong_seller','wrong_amount','duplicate','not_a_purchase','refund_received','loss_resolved','other') then raise exception 'invalid_issue';end if;
  if p_email !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or length(p_email)>254 then raise exception 'invalid_email';end if;
  if length(coalesce(p_details,''))>500 or p_fingerprint !~ '^[0-9a-f]{64}$' or p_content_fingerprint !~ '^[0-9a-f]{64}$' then raise exception 'invalid_request';end if;
  if exists(select 1 from public.blocked_fingerprints where fingerprint=p_fingerprint) then raise exception 'rate_limited';end if;
  perform pg_advisory_xact_lock(hashtextextended(p_fingerprint,0));
  if (select count(*) from public.submission_events where fingerprint=p_fingerprint and kind='correction' and created_at>now()-interval '1 day')>=3 then raise exception 'rate_limited';end if;
  if (select count(*) from public.submission_events where kind in ('purchase','correction') and created_at>now()-interval '1 hour')>=50 then raise exception 'circuit_open';end if;
  select id into v_id from public.correction_requests where content_fingerprint=p_content_fingerprint and created_at>now()-interval '30 days' order by created_at desc limit 1;if v_id is not null then return v_id;end if;
  insert into public.submission_events(fingerprint,kind,content_fingerprint,idempotency_key) values(p_fingerprint,'correction',p_content_fingerprint,p_idempotency);
  insert into public.correction_requests(purchase_id,issue_type,contact_email,details,idempotency_key,submitter_fingerprint,content_fingerprint)
    values(p_purchase,p_issue,p_email,p_details,p_idempotency,p_fingerprint,p_content_fingerprint) returning id into v_id;return v_id;
end $$;

create or replace function public.review_purchase_secure(p_id uuid,p_decision text,p_actor text,p_reason text,p_actor_id uuid,p_session_id uuid,p_request_id text)
returns void language plpgsql security definer set search_path=pg_catalog,public as $$
declare v_seller uuid;v_before jsonb;v_has_evidence boolean;
begin
  if p_decision not in ('approved','rejected') then raise exception 'invalid_decision';end if;
  select p.seller_id,to_jsonb(p.*),p.evidence_path is not null into v_seller,v_before,v_has_evidence from public.purchases p where p.id=p_id and p.moderation_status='pending' for update;
  if v_seller is null then raise exception 'not_pending';end if;
  if p_decision='approved' and not v_has_evidence and length(btrim(coalesce(p_reason,'')))<10 then raise exception 'invalid_reason';end if;
  update public.purchases set moderation_status=p_decision,reviewed_at=now(),reviewed_by=p_actor,moderation_reason=nullif(btrim(p_reason),''),private_purge_after=case when p_decision='rejected' then now()+interval '30 days' else null end where id=p_id;
  if p_decision='approved' then update public.sellers set status='active',updated_at=now() where id=v_seller and status='pending';end if;
  insert into public.moderation_audit(actor,actor_id,session_id,request_id,action,target_type,target_id,reason,detail)
    values(p_actor,p_actor_id,p_session_id,p_request_id,p_decision,'purchase',p_id,nullif(btrim(p_reason),''),jsonb_build_object('before',v_before,'after_status',p_decision));
end $$;

create or replace function public.record_admin_action(p_actor text,p_actor_id uuid,p_session_id uuid,p_action text,p_target_id uuid,p_reason text,p_request_id text,p_detail jsonb)
returns void language plpgsql security definer set search_path=pg_catalog,public as $$
begin insert into public.moderation_audit(actor,actor_id,session_id,request_id,action,target_type,target_id,reason,detail)
values(p_actor,p_actor_id,p_session_id,p_request_id,left(p_action,80),'admin_action',p_target_id,nullif(btrim(p_reason),''),coalesce(p_detail,'{}'));end $$;

create or replace function public.get_admin_sessions(p_user_id uuid)
returns jsonb language sql stable security definer set search_path=pg_catalog,public as $$
select coalesce(jsonb_agg(jsonb_build_object('id',s.id,'created_at',s.created_at,'updated_at',s.updated_at) order by s.updated_at desc),'[]'::jsonb)
from (select id,created_at,updated_at from auth.sessions where user_id=p_user_id order by updated_at desc limit 20) s;
$$;

create or replace function public.adjust_unresolved_loss(p_id uuid,p_amount numeric,p_actor text)
returns void language plpgsql security definer set search_path=pg_catalog,public as $$
declare v_before numeric;v_limit numeric;
begin select unresolved_amount,reported_unresolved_amount into v_before,v_limit from public.purchases where id=p_id and moderation_status='approved' and loss_issue is not null for update;if not found then raise exception 'record_unavailable';end if;
if p_amount is null or p_amount<0 or p_amount>v_limit or p_amount<>round(p_amount,2) then raise exception 'invalid_unresolved_amount';end if;
update public.purchases set unresolved_amount=p_amount,loss_status=case when p_amount=0 then 'resolved' else 'open' end,private_purge_after=case when p_amount=0 then now()+interval '90 days' else null end where id=p_id;
insert into public.moderation_audit(actor,action,target_type,target_id,detail) values(p_actor,case when p_amount=0 then 'resolve_loss' else 'adjust_loss' end,'purchase',p_id,jsonb_build_object('before',v_before,'after',p_amount));end $$;

create or replace function public.retract_purchase(p_id uuid,p_actor text)
returns void language plpgsql security definer set search_path=pg_catalog,public as $$
begin update public.purchases set moderation_status='rejected',reviewed_at=now(),reviewed_by=p_actor,private_purge_after=now()+interval '90 days' where id=p_id and moderation_status='approved';if not found then raise exception 'record_unavailable';end if;insert into public.moderation_audit(actor,action,target_type,target_id) values(p_actor,'retract','purchase',p_id);end $$;

create or replace function public.resolve_correction(p_id uuid,p_decision text,p_actor text)
returns void language plpgsql security definer set search_path=pg_catalog,public as $$
begin if p_decision not in ('resolved','dismissed') then raise exception 'invalid_decision';end if;update public.correction_requests set status=p_decision,reviewed_at=now(),reviewed_by=p_actor,private_purge_after=now()+case when p_decision='resolved' then interval '90 days' else interval '30 days' end where id=p_id and status='open';if not found then raise exception 'not_open';end if;insert into public.moderation_audit(actor,action,target_type,target_id) values(p_actor,p_decision,'correction',p_id);end $$;

create or replace function public.private_retention_candidates()
returns table(purchase_id uuid,evidence_path text) language sql security definer set search_path=pg_catalog,public as $$
select p.id,p.evidence_path from public.purchases p where p.private_purged_at is null and ((p.private_purge_after is not null and p.private_purge_after<=now()) or (p.moderation_status='pending' and p.created_at<=now()-interval '90 days')) limit 100;
$$;
create or replace function public.purge_private_data(p_purchase_id uuid)
returns void language plpgsql security definer set search_path=pg_catalog,public as $$
begin update public.purchases set buyer_username='[purged]',loss_details='Private data purged.',evidence_path=null,submitter_fingerprint=repeat('0',64),private_purged_at=now() where id=p_purchase_id and private_purged_at is null and ((private_purge_after is not null and private_purge_after<=now()) or (moderation_status='pending' and created_at<=now()-interval '90 days'));
update public.correction_requests set contact_email='purged@invalid.local',details=null,submitter_fingerprint=null,content_fingerprint=null,private_purged_at=now() where purchase_id=p_purchase_id and private_purge_after<=now() and private_purged_at is null;end $$;
create or replace function public.cleanup_security_events()
returns void language plpgsql security definer set search_path=pg_catalog,public as $$ begin delete from public.submission_events where created_at<now()-interval '30 days';delete from public.security_events where created_at<now()-interval '180 days';update public.correction_requests set contact_email='purged@invalid.local',details=null,submitter_fingerprint=null,content_fingerprint=null,private_purged_at=now() where private_purge_after<=now() and private_purged_at is null;end $$;

create or replace function public.prevent_audit_mutation() returns trigger language plpgsql set search_path=pg_catalog,public as $$ begin raise exception 'audit_append_only';end $$;
drop trigger if exists moderation_audit_append_only on public.moderation_audit;
create trigger moderation_audit_append_only before update or delete on public.moderation_audit for each row execute function public.prevent_audit_mutation();
revoke update,delete,truncate on public.moderation_audit from service_role,anon,authenticated;

revoke all on function public.submit_purchase(text,date,integer,numeric,uuid,text,text,text) from service_role;
revoke all on function public.submit_loss_report_with_buyer(text,text,date,integer,numeric,numeric,text,text,uuid,text,text,text) from service_role;
revoke all on function public.submit_correction(uuid,text,text,text,text) from service_role;
revoke all on function public.log_security_event(text,text,text,text,jsonb),public.reserve_auth_attempt(text,text),public.reserve_loss_submission(text,text,text,uuid),public.submit_loss_report_secure(text,text,date,integer,numeric,numeric,text,text,uuid,text,text,text,boolean),public.submit_correction_secure(uuid,text,text,text,text,text,uuid),public.review_purchase_secure(uuid,text,text,text,uuid,uuid,text),public.record_admin_action(text,uuid,uuid,text,uuid,text,text,jsonb),public.get_admin_sessions(uuid),public.private_retention_candidates(),public.purge_private_data(uuid),public.cleanup_security_events() from public,anon,authenticated;
grant execute on function public.log_security_event(text,text,text,text,jsonb),public.reserve_auth_attempt(text,text),public.reserve_loss_submission(text,text,text,uuid),public.submit_loss_report_secure(text,text,date,integer,numeric,numeric,text,text,uuid,text,text,text,boolean),public.submit_correction_secure(uuid,text,text,text,text,text,uuid),public.review_purchase_secure(uuid,text,text,text,uuid,uuid,text),public.record_admin_action(text,uuid,uuid,text,uuid,text,text,jsonb),public.get_admin_sessions(uuid),public.private_retention_candidates(),public.purge_private_data(uuid),public.cleanup_security_events() to service_role;

-- Keep existing functions service-only while hardening name resolution.
alter function public.review_purchase(uuid,text,text) set search_path=pg_catalog,public;
alter function public.merge_sellers(uuid,uuid,text) set search_path=pg_catalog,public;
alter function public.adjust_unresolved_loss(uuid,numeric,text) set search_path=pg_catalog,public;
alter function public.retract_purchase(uuid,text) set search_path=pg_catalog,public;
alter function public.set_seller_status(uuid,text,text) set search_path=pg_catalog,public;
alter function public.resolve_correction(uuid,text,text) set search_path=pg_catalog,public;
alter function public.block_submitter(text,text) set search_path=pg_catalog,public;
alter function public.unblock_submitter(text,text) set search_path=pg_catalog,public;

-- Public callers receive only the already-approved fields projected by the safe views.
create or replace function public.get_public_overview() returns jsonb language sql stable security definer set search_path=pg_catalog,public as $$
select jsonb_build_object(
  'totals',coalesce((select to_jsonb(t) from public.platform_loss_statistics t limit 1),jsonb_build_object('unresolved_amount','0.00','report_count',0,'visible_sellers',0)),
  'leaders',coalesce((select jsonb_agg(to_jsonb(s) order by s.unresolved_amount desc,s.normalized_username asc) from (select * from public.seller_loss_statistics order by unresolved_amount desc,normalized_username asc limit 100) s),'[]'::jsonb),
  'recent',coalesce((select jsonb_agg(to_jsonb(r) order by r.created_at desc,r.id desc) from (select * from public.public_loss_rows order by created_at desc,id desc limit 20) r),'[]'::jsonb)
);$$;
create or replace function public.get_public_records() returns jsonb language sql stable security definer set search_path=pg_catalog,public as $$
select coalesce(jsonb_agg(to_jsonb(r) order by r.created_at desc,r.id desc),'[]'::jsonb) from (select * from public.public_loss_rows order by created_at desc,id desc limit 20) r;$$;
create or replace function public.search_public_sellers(p_search text) returns jsonb language sql stable security definer set search_path=pg_catalog,public as $$
select coalesce(jsonb_agg(to_jsonb(s) order by s.normalized_username asc),'[]'::jsonb) from (select id,username,normalized_username,unresolved_amount,report_count from public.seller_loss_statistics where normalized_username like lower(regexp_replace(left(coalesce(p_search,''),64),'[^a-z0-9._-]','','g'))||'%' order by normalized_username asc limit 8) s;$$;
create or replace function public.get_public_seller(p_handle text) returns jsonb language plpgsql stable security definer set search_path=pg_catalog,public as $$
declare v_handle text:=lower(regexp_replace(trim(p_handle),'^@+',''));v_seller public.seller_loss_statistics%rowtype;v_redirect text;
begin select * into v_seller from public.seller_loss_statistics where normalized_username=v_handle limit 1;if found then return jsonb_build_object('seller',to_jsonb(v_seller),'reports',coalesce((select jsonb_agg(to_jsonb(r) order by r.purchase_date desc,r.created_at desc,r.id desc) from (select * from public.public_loss_rows where seller_id=v_seller.id order by purchase_date desc,created_at desc,id desc limit 100) r),'[]'::jsonb));end if;
select target.normalized_username into v_redirect from public.sellers source join public.sellers target on target.id=source.merged_into where source.normalized_username=v_handle and source.status='merged' limit 1;if v_redirect is not null then return jsonb_build_object('redirect',v_redirect);end if;return null;end $$;
create or replace function public.get_public_record(p_id uuid) returns jsonb language sql stable security definer set search_path=pg_catalog,public as $$ select to_jsonb(r) from public.public_loss_rows r where r.id=p_id limit 1;$$;
revoke all on function public.get_public_overview(),public.get_public_records(),public.search_public_sellers(text),public.get_public_seller(text),public.get_public_record(uuid) from public,authenticated;
grant execute on function public.get_public_overview(),public.get_public_records(),public.search_public_sellers(text),public.get_public_seller(text),public.get_public_record(uuid) to anon,service_role;

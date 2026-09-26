-- Additive rollout for account-type labels and moderator-managed seller images.
create table if not exists public.account_types (
  slug text primary key check (slug ~ '^[a-z0-9-]{2,40}$'),
  label text not null check (length(label) between 2 and 40),
  active boolean not null default true,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now()
);
create table if not exists public.purchase_account_types (
  purchase_id uuid not null references public.purchases(id) on delete cascade,
  account_type_slug text not null references public.account_types(slug),
  custom_label text check (custom_label is null or length(custom_label) between 2 and 40),
  primary key(purchase_id,account_type_slug),
  check ((account_type_slug='other' and custom_label is not null) or (account_type_slug<>'other' and custom_label is null))
);
alter table public.account_types enable row level security;
alter table public.purchase_account_types enable row level security;
revoke all on public.account_types,public.purchase_account_types from public,anon,authenticated;
grant select,insert,update,delete on public.account_types,public.purchase_account_types to service_role;

insert into public.account_types(slug,label,sort_order) values
('chatgpt','ChatGPT',10),('claude','Claude',20),('gemini','Gemini',30),('adobe','Adobe',40),
('microsoft-365','Microsoft 365',50),('canva','Canva',60),('midjourney','Midjourney',70),
('perplexity','Perplexity',80),('other','Other',90)
on conflict(slug) do update set label=excluded.label,sort_order=excluded.sort_order;

alter table public.sellers add column if not exists avatar_path text;
alter table public.sellers add column if not exists avatar_updated_at timestamptz;
alter table public.sellers add constraint sellers_avatar_path_format check (avatar_path is null or avatar_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.webp$') not valid;
alter table public.sellers validate constraint sellers_avatar_path_format;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('seller-profile-images','seller-profile-images',false,5242880,array['image/webp'])
on conflict(id) do update set public=false,file_size_limit=5242880,allowed_mime_types=array['image/webp'];

create or replace function public.submit_loss_report_secure_v2(
  p_handle text,p_buyer_username text,p_date date,p_quantity integer,p_unit_price numeric,
  p_unresolved_amount numeric,p_issue text,p_details text,p_idempotency uuid,p_fingerprint text,
  p_duplicate_key text,p_account_types text[],p_other_account_type text default null,
  p_evidence_path text default null,p_evidence_sanitized boolean default false
) returns uuid language plpgsql security definer set search_path=pg_catalog,public as $$
declare v_handle text:=lower(regexp_replace(trim(p_handle),'^@+',''));v_buyer text:=btrim(p_buyer_username);v_seller uuid;v_id uuid;v_flags text[]:='{}';v_status text;v_target uuid;v_duplicate uuid;v_slug text;v_other text:=regexp_replace(btrim(coalesce(p_other_account_type,'')),'[[:space:]]+',' ','g');
begin
  perform pg_advisory_xact_lock(hashtextextended(p_idempotency::text,0));
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
  if coalesce(array_length(p_account_types,1),0) not between 1 and 8 or cardinality(p_account_types)<>cardinality(array(select distinct x from unnest(p_account_types) x)) then raise exception 'invalid_account_types';end if;
  if exists(select 1 from unnest(p_account_types) x left join public.account_types a on a.slug=x and a.active where a.slug is null) then raise exception 'invalid_account_types';end if;
  if 'other'=any(p_account_types) then if length(v_other) not between 2 and 40 or v_other ~ '[[:cntrl:]<>]' then raise exception 'invalid_other_account_type';end if; elsif v_other<>'' then raise exception 'invalid_other_account_type';end if;
  select flags into v_flags from public.submission_events where idempotency_key=p_idempotency and kind='purchase' order by created_at desc limit 1;
  if p_quantity>100 then v_flags:=array_append(v_flags,'large_quantity');end if;if p_unit_price>100000 then v_flags:=array_append(v_flags,'high_price');end if;
  select id into v_duplicate from public.purchases where duplicate_key=p_duplicate_key and created_at>now()-interval '30 days' order by created_at desc limit 1;
  if v_duplicate is not null and not ('exact_duplicate'=any(v_flags)) then v_flags:=array_append(v_flags,'exact_duplicate');end if;
  insert into public.sellers(username,normalized_username) values(v_handle,v_handle) on conflict(normalized_username) do update set updated_at=now() returning id into v_seller;
  select status,merged_into into v_status,v_target from public.sellers where id=v_seller;if v_status='suspended' then raise exception 'seller_unavailable';end if;if v_status='merged' then v_seller:=v_target;end if;
  insert into public.purchases(seller_id,buyer_username,purchase_date,quantity,unit_price,loss_issue,loss_details,reported_unresolved_amount,unresolved_amount,loss_status,idempotency_key,submitter_fingerprint,duplicate_key,evidence_path,evidence_sanitized,linked_duplicate_id,flags)
  values(v_seller,v_buyer,p_date,p_quantity,p_unit_price,p_issue,trim(p_details),p_unresolved_amount,p_unresolved_amount,'open',p_idempotency,p_fingerprint,p_duplicate_key,p_evidence_path,p_evidence_sanitized,v_duplicate,coalesce(v_flags,'{}')) returning id into v_id;
  foreach v_slug in array p_account_types loop insert into public.purchase_account_types(purchase_id,account_type_slug,custom_label) values(v_id,v_slug,case when v_slug='other' then v_other else null end);end loop;
  return v_id;
end $$;

create or replace function public.set_purchase_account_types(p_purchase_id uuid,p_account_types text[],p_other_account_type text)
returns void language plpgsql security definer set search_path=pg_catalog,public as $$
declare v_slug text;v_other text:=regexp_replace(btrim(coalesce(p_other_account_type,'')),'[[:space:]]+',' ','g');
begin
  if not exists(select 1 from public.purchases where id=p_purchase_id) then raise exception 'record_unavailable';end if;
  if coalesce(array_length(p_account_types,1),0) not between 1 and 8 or cardinality(p_account_types)<>cardinality(array(select distinct x from unnest(p_account_types) x)) then raise exception 'invalid_account_types';end if;
  if exists(select 1 from unnest(p_account_types) x left join public.account_types a on a.slug=x and a.active where a.slug is null) then raise exception 'invalid_account_types';end if;
  if 'other'=any(p_account_types) then if length(v_other) not between 2 and 40 or v_other ~ '[[:cntrl:]<>]' then raise exception 'invalid_other_account_type';end if; elsif v_other<>'' then raise exception 'invalid_other_account_type';end if;
  delete from public.purchase_account_types where purchase_id=p_purchase_id;
  foreach v_slug in array p_account_types loop insert into public.purchase_account_types(purchase_id,account_type_slug,custom_label) values(p_purchase_id,v_slug,case when v_slug='other' then v_other else null end);end loop;
end $$;

create or replace function public.remove_seller_avatar(p_seller_id uuid,p_actor text,p_actor_id uuid,p_session_id uuid,p_reason text,p_request_id text)
returns text language plpgsql security definer set search_path=pg_catalog,public as $$
declare v_old text;
begin select avatar_path into v_old from public.sellers where id=p_seller_id and status<>'merged' for update;if not found then raise exception 'seller_unavailable';end if;
update public.sellers set avatar_path=null,avatar_updated_at=now(),updated_at=now() where id=p_seller_id;
insert into public.moderation_audit(actor,actor_id,session_id,request_id,action,target_type,target_id,reason,detail) values(p_actor,p_actor_id,p_session_id,p_request_id,'remove_seller_avatar','seller',p_seller_id,nullif(btrim(p_reason),''),jsonb_build_object('had_image',v_old is not null));return v_old;end $$;

create or replace function public.replace_seller_avatar(p_seller_id uuid,p_new_path text,p_actor text,p_actor_id uuid,p_session_id uuid,p_reason text,p_request_id text)
returns text language plpgsql security definer set search_path=pg_catalog,public as $$
declare v_old text;
begin if p_new_path !~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.webp$' then raise exception 'invalid_avatar';end if;
select avatar_path into v_old from public.sellers where id=p_seller_id and status<>'merged' for update;if not found then raise exception 'seller_unavailable';end if;
update public.sellers set avatar_path=p_new_path,avatar_updated_at=now(),updated_at=now() where id=p_seller_id;
insert into public.moderation_audit(actor,actor_id,session_id,request_id,action,target_type,target_id,reason,detail) values(p_actor,p_actor_id,p_session_id,p_request_id,'replace_seller_avatar','seller',p_seller_id,nullif(btrim(p_reason),''),jsonb_build_object('had_previous',v_old is not null));return v_old;end $$;

create or replace view public.seller_loss_statistics as
select s.id,s.username,s.normalized_username,coalesce(sum(p.unresolved_amount),0)::numeric(16,2) unresolved_amount,count(p.id)::bigint report_count,
  coalesce((select array_agg(distinct coalesce(pat.custom_label,a.label) order by coalesce(pat.custom_label,a.label)) from public.purchases p2 join public.purchase_account_types pat on pat.purchase_id=p2.id join public.account_types a on a.slug=pat.account_type_slug where p2.seller_id=s.id and p2.moderation_status='approved' and p2.loss_status='open' and p2.unresolved_amount>0),'{}'::text[]) account_types,
  (s.avatar_path is not null) has_avatar,s.avatar_updated_at
from public.sellers s join public.purchases p on p.seller_id=s.id and p.moderation_status='approved' and p.loss_status='open' and p.unresolved_amount>0 where s.status='active'
group by s.id,s.username,s.normalized_username,s.avatar_path,s.avatar_updated_at;

create or replace view public.public_loss_rows as
select p.id,p.seller_id,s.username,s.normalized_username,p.purchase_date,p.quantity,p.unit_price,p.total_amount,p.unresolved_amount,p.loss_issue,p.created_at,
  coalesce((select array_agg(coalesce(pat.custom_label,a.label) order by a.sort_order,a.label) from public.purchase_account_types pat join public.account_types a on a.slug=pat.account_type_slug where pat.purchase_id=p.id),'{}'::text[]) account_types
from public.purchases p join public.sellers s on s.id=p.seller_id where p.moderation_status='approved' and p.loss_status='open' and p.unresolved_amount>0 and s.status='active';

create or replace function public.get_account_types() returns jsonb language sql stable security definer set search_path=pg_catalog,public as $$
select coalesce(jsonb_agg(jsonb_build_object('slug',slug,'label',label) order by sort_order,label),'[]'::jsonb) from public.account_types where active;$$;
create or replace function public.search_public_sellers(p_search text) returns jsonb language sql stable security definer set search_path=pg_catalog,public as $$
select coalesce(jsonb_agg(to_jsonb(s) order by s.normalized_username),'[]'::jsonb) from (select id,username,normalized_username,unresolved_amount,report_count,account_types,has_avatar,avatar_updated_at from public.seller_loss_statistics where normalized_username like lower(regexp_replace(left(coalesce(p_search,''),64),'[^a-z0-9._-]','','g'))||'%' order by normalized_username limit 8) s;$$;

revoke all on function public.submit_loss_report_secure_v2(text,text,date,integer,numeric,numeric,text,text,uuid,text,text,text[],text,text,boolean),public.set_purchase_account_types(uuid,text[],text) from public,anon,authenticated;
grant execute on function public.submit_loss_report_secure_v2(text,text,date,integer,numeric,numeric,text,text,uuid,text,text,text[],text,text,boolean),public.set_purchase_account_types(uuid,text[],text) to service_role;
revoke all on function public.replace_seller_avatar(uuid,text,text,uuid,uuid,text,text),public.remove_seller_avatar(uuid,text,uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.replace_seller_avatar(uuid,text,text,uuid,uuid,text,text),public.remove_seller_avatar(uuid,text,uuid,uuid,text,text) to service_role;
revoke all on function public.get_account_types() from public,authenticated;
grant execute on function public.get_account_types() to anon,service_role;

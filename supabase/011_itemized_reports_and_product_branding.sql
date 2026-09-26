-- Additive rollout for itemized loss reports. Keep submit_loss_report_secure_v2
-- until the v3 application has passed production smoke tests.
alter table public.purchases add column if not exists is_itemized boolean not null default false;
alter table public.purchases alter column purchase_date drop not null;
alter table public.purchases alter column quantity drop not null;
alter table public.purchases alter column unit_price drop not null;
alter table public.purchases drop constraint if exists loss_report_complete;
alter table public.purchases add constraint loss_report_complete check (
  (loss_issue is null and loss_details is null and reported_unresolved_amount is null and unresolved_amount is null and loss_status is null)
  or (loss_issue is not null and loss_details is not null and reported_unresolved_amount > 0
    and unresolved_amount >= 0 and unresolved_amount <= reported_unresolved_amount and loss_status is not null
    and ((loss_status='open' and unresolved_amount>0) or (loss_status='resolved' and unresolved_amount=0))
    and ((not is_itemized and purchase_date is not null and quantity is not null and unit_price is not null and reported_unresolved_amount<=quantity*unit_price)
      or (is_itemized and purchase_date is null and quantity is null and unit_price is null)))
);

create table if not exists public.purchase_items (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references public.purchases(id) on delete cascade,
  account_type_slug text not null references public.account_types(slug),
  custom_label text,
  quantity integer not null check(quantity between 1 and 10000),
  unit_price numeric(12,2) not null check(unit_price between 0.01 and 1000000 and unit_price=round(unit_price,2)),
  total_amount numeric(16,2) generated always as (quantity*unit_price) stored,
  sort_order smallint not null check(sort_order between 0 and 7),
  created_at timestamptz not null default now(),
  unique(purchase_id,sort_order),
  check((account_type_slug='other' and custom_label is not null and length(custom_label) between 2 and 40)
    or (account_type_slug<>'other' and custom_label is null))
);
alter table public.purchase_items enable row level security;
revoke all on public.purchase_items from public,anon,authenticated;
grant select,insert,update,delete on public.purchase_items to service_role;
create index if not exists purchase_items_purchase on public.purchase_items(purchase_id,sort_order);
create index if not exists purchase_items_type on public.purchase_items(account_type_slug,purchase_id);

create or replace function public.submit_loss_report_secure_v3(
  p_handle text,p_buyer_username text,p_items jsonb,p_issue text,p_details text,
  p_idempotency uuid,p_fingerprint text,p_duplicate_key text,
  p_evidence_path text default null,p_evidence_sanitized boolean default false
) returns uuid language plpgsql security definer set search_path=pg_catalog,public as $$
declare
  v_handle text:=lower(regexp_replace(trim(p_handle),'^@+',''));v_buyer text:=btrim(p_buyer_username);
  v_seller uuid;v_id uuid;v_flags text[]:='{}';v_status text;v_target uuid;v_duplicate uuid;
  v_item jsonb;v_slug text;v_other text;v_quantity integer;v_price numeric;v_total numeric(16,2):=0;v_index integer:=0;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_idempotency::text,0));
  select id into v_id from public.purchases where idempotency_key=p_idempotency;if v_id is not null then return v_id;end if;
  if not exists(select 1 from public.submission_events where fingerprint=p_fingerprint and idempotency_key=p_idempotency and kind='purchase' and created_at>now()-interval '15 minutes') then raise exception 'rate_limited';end if;
  if v_handle !~ '^[a-z0-9._-]{2,64}$' then raise exception 'invalid_handle';end if;
  if v_buyer is null or length(v_buyer) not between 2 and 64 or v_buyer ~ '[[:cntrl:]<>]' then raise exception 'invalid_buyer_username';end if;
  if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items) not between 1 and 8 then raise exception 'invalid_items';end if;
  for v_item in select value from jsonb_array_elements(p_items) loop
    if jsonb_typeof(v_item)<>'object' then raise exception 'invalid_items';end if;
    v_slug:=lower(btrim(coalesce(v_item->>'accountType','')));
    v_other:=regexp_replace(btrim(coalesce(v_item->>'otherAccountType','')),'[[:space:]]+',' ','g');
    if coalesce(v_item->>'quantity','') !~ '^[1-9][0-9]{0,4}$' or (v_item->>'quantity')::integer>10000 then raise exception 'invalid_quantity';end if;
    if coalesce(v_item->>'unitPrice','') !~ '^(0|[1-9][0-9]{0,6})(\.[0-9]{1,2})?$' then raise exception 'invalid_price';end if;
    v_quantity:=(v_item->>'quantity')::integer;v_price:=(v_item->>'unitPrice')::numeric;
    if v_price not between 0.01 and 1000000 or v_price<>round(v_price,2) then raise exception 'invalid_price';end if;
    if not exists(select 1 from public.account_types where slug=v_slug and active) then raise exception 'invalid_account_type';end if;
    if v_slug='other' then if length(v_other) not between 2 and 40 or v_other ~ '[[:cntrl:]<>]' then raise exception 'invalid_other_account_type';end if;
    elsif v_other<>'' then raise exception 'invalid_other_account_type';end if;
    v_total:=v_total+(v_quantity*v_price);v_index:=v_index+1;
  end loop;
  if v_total<=0 or v_total<>round(v_total,2) then raise exception 'invalid_total';end if;
  if p_issue not in ('not_delivered','refund_not_received','other_unresolved') then raise exception 'invalid_issue';end if;
  if length(coalesce(trim(p_details),'')) not between 10 and 500 then raise exception 'invalid_details';end if;
  if p_fingerprint !~ '^[0-9a-f]{64}$' or p_duplicate_key !~ '^[0-9a-f]{64}$' then raise exception 'invalid_fingerprint';end if;
  if p_evidence_path is not null and (not p_evidence_sanitized or p_evidence_path !~ '^[0-9a-f-]{36}\.webp$') then raise exception 'invalid_evidence';end if;
  select flags into v_flags from public.submission_events where idempotency_key=p_idempotency and kind='purchase' order by created_at desc limit 1;
  if exists(select 1 from jsonb_array_elements(p_items) i where (i->>'quantity')::integer>100) then v_flags:=array_append(v_flags,'large_quantity');end if;
  if exists(select 1 from jsonb_array_elements(p_items) i where (i->>'unitPrice')::numeric>100000) then v_flags:=array_append(v_flags,'high_price');end if;
  select id into v_duplicate from public.purchases where duplicate_key=p_duplicate_key and created_at>now()-interval '30 days' order by created_at desc limit 1;
  if v_duplicate is not null and not ('exact_duplicate'=any(v_flags)) then v_flags:=array_append(v_flags,'exact_duplicate');end if;
  insert into public.sellers(username,normalized_username) values(v_handle,v_handle) on conflict(normalized_username) do update set updated_at=now() returning id into v_seller;
  select status,merged_into into v_status,v_target from public.sellers where id=v_seller;if v_status='suspended' then raise exception 'seller_unavailable';end if;if v_status='merged' then v_seller:=v_target;end if;
  insert into public.purchases(seller_id,buyer_username,purchase_date,quantity,unit_price,is_itemized,loss_issue,loss_details,reported_unresolved_amount,unresolved_amount,loss_status,idempotency_key,submitter_fingerprint,duplicate_key,evidence_path,evidence_sanitized,linked_duplicate_id,flags)
  values(v_seller,v_buyer,null,null,null,true,p_issue,trim(p_details),v_total,v_total,'open',p_idempotency,p_fingerprint,p_duplicate_key,p_evidence_path,p_evidence_sanitized,v_duplicate,coalesce(v_flags,'{}')) returning id into v_id;
  v_index:=0;
  for v_item in select value from jsonb_array_elements(p_items) loop
    v_slug:=lower(btrim(v_item->>'accountType'));v_other:=regexp_replace(btrim(coalesce(v_item->>'otherAccountType','')),'[[:space:]]+',' ','g');
    insert into public.purchase_items(purchase_id,account_type_slug,custom_label,quantity,unit_price,sort_order)
    values(v_id,v_slug,case when v_slug='other' then v_other else null end,(v_item->>'quantity')::integer,(v_item->>'unitPrice')::numeric,v_index);v_index:=v_index+1;
  end loop;
  return v_id;
end $$;

create or replace function public.set_purchase_items_secure(p_purchase_id uuid,p_items jsonb)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare v_item jsonb;v_slug text;v_other text;v_quantity integer;v_price numeric;v_total numeric(16,2):=0;v_index integer:=0;v_before jsonb;v_old_unresolved numeric;
begin
  select unresolved_amount into v_old_unresolved from public.purchases where id=p_purchase_id and loss_issue is not null for update;if not found then raise exception 'record_unavailable';end if;
  if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items) not between 1 and 8 then raise exception 'invalid_items';end if;
  select coalesce(jsonb_agg(jsonb_build_object('accountType',account_type_slug,'otherAccountType',custom_label,'quantity',quantity,'unitPrice',unit_price) order by sort_order),'[]') into v_before from public.purchase_items where purchase_id=p_purchase_id;
  for v_item in select value from jsonb_array_elements(p_items) loop
    v_slug:=lower(btrim(coalesce(v_item->>'accountType','')));v_other:=regexp_replace(btrim(coalesce(v_item->>'otherAccountType','')),'[[:space:]]+',' ','g');
    if coalesce(v_item->>'quantity','') !~ '^[1-9][0-9]{0,4}$' or (v_item->>'quantity')::integer>10000 then raise exception 'invalid_quantity';end if;
    if coalesce(v_item->>'unitPrice','') !~ '^(0|[1-9][0-9]{0,6})(\.[0-9]{1,2})?$' then raise exception 'invalid_price';end if;
    v_quantity:=(v_item->>'quantity')::integer;v_price:=(v_item->>'unitPrice')::numeric;
    if v_price not between 0.01 and 1000000 or not exists(select 1 from public.account_types where slug=v_slug and active) then raise exception 'invalid_item';end if;
    if v_slug='other' then if length(v_other) not between 2 and 40 or v_other ~ '[[:cntrl:]<>]' then raise exception 'invalid_other_account_type';end if;elsif v_other<>'' then raise exception 'invalid_other_account_type';end if;
    v_total:=v_total+(v_quantity*v_price);
  end loop;
  delete from public.purchase_items where purchase_id=p_purchase_id;v_index:=0;
  for v_item in select value from jsonb_array_elements(p_items) loop
    v_slug:=lower(btrim(v_item->>'accountType'));v_other:=regexp_replace(btrim(coalesce(v_item->>'otherAccountType','')),'[[:space:]]+',' ','g');
    insert into public.purchase_items(purchase_id,account_type_slug,custom_label,quantity,unit_price,sort_order) values(p_purchase_id,v_slug,case when v_slug='other' then v_other else null end,(v_item->>'quantity')::integer,(v_item->>'unitPrice')::numeric,v_index);v_index:=v_index+1;
  end loop;
  update public.purchases set is_itemized=true,purchase_date=null,quantity=null,unit_price=null,reported_unresolved_amount=v_total,
    unresolved_amount=least(v_old_unresolved,v_total),loss_status=case when least(v_old_unresolved,v_total)=0 then 'resolved' else 'open' end
    where id=p_purchase_id;
  return jsonb_build_object('before',v_before,'after',p_items,'reportedTotal',v_total);
end $$;

create or replace view public.purchase_report_values as
select p.id,
  coalesce(i.reported_purchase_value,p.total_amount,0)::numeric(16,2) reported_purchase_value,
  coalesce(i.accounts_reported_purchased,p.quantity,0)::bigint accounts_reported_purchased,
  coalesce(i.items,'[]'::jsonb) items
from public.purchases p left join lateral (
  select sum(pi.total_amount)::numeric(16,2) reported_purchase_value,sum(pi.quantity)::bigint accounts_reported_purchased,
    jsonb_agg(jsonb_build_object('id',pi.id,'account_type_slug',pi.account_type_slug,'label',coalesce(pi.custom_label,a.label),'quantity',pi.quantity,'unit_price',pi.unit_price,'total_amount',pi.total_amount) order by pi.sort_order) items
  from public.purchase_items pi join public.account_types a on a.slug=pi.account_type_slug where pi.purchase_id=p.id
) i on true;

create or replace view public.purchase_product_rows as
select p.id purchase_id,p.seller_id,pi.account_type_slug,coalesce(pi.custom_label,a.label) label,pi.quantity,pi.total_amount,a.sort_order
from public.purchases p join public.purchase_items pi on pi.purchase_id=p.id join public.account_types a on a.slug=pi.account_type_slug
union all
select p.id,p.seller_id,pat.account_type_slug,coalesce(pat.custom_label,a.label),p.quantity,p.total_amount,a.sort_order
from public.purchases p join public.purchase_account_types pat on pat.purchase_id=p.id join public.account_types a on a.slug=pat.account_type_slug
where not exists(select 1 from public.purchase_items pi where pi.purchase_id=p.id)
  and (select count(*) from public.purchase_account_types x where x.purchase_id=p.id)=1;

create or replace view public.seller_loss_statistics as
select s.id,s.username,s.normalized_username,
  coalesce(sum(p.unresolved_amount),0)::numeric(16,2) unresolved_amount,count(p.id)::bigint report_count,
  coalesce(types.labels,'{}'::text[]) account_types,(s.avatar_path is not null) has_avatar,s.avatar_updated_at,
  coalesce(sum(rv.reported_purchase_value),0)::numeric(16,2) reported_purchase_value,
  coalesce(sum(rv.accounts_reported_purchased),0)::bigint accounts_reported_purchased,
  primary_type.value primary_account_type,coalesce(types.breakdown,'[]'::jsonb) account_type_breakdown
from public.sellers s
join public.purchases p on p.seller_id=s.id and p.moderation_status='approved' and p.loss_status='open' and p.unresolved_amount>0
join public.purchase_report_values rv on rv.id=p.id
left join lateral (
  select array_agg(x.label order by x.sort_order,x.label) labels,
    jsonb_agg(jsonb_build_object('slug',x.account_type_slug,'label',x.label,'accounts',x.accounts,'reported_purchase_value',x.value) order by x.accounts desc,x.value desc,x.sort_order,x.label) breakdown
  from (select pr.account_type_slug,pr.label,min(pr.sort_order) sort_order,sum(pr.quantity)::bigint accounts,sum(pr.total_amount)::numeric(16,2) value
    from public.purchase_product_rows pr join public.purchases px on px.id=pr.purchase_id
    where pr.seller_id=s.id and px.moderation_status='approved' and px.loss_status='open' and px.unresolved_amount>0 group by pr.account_type_slug,pr.label) x
) types on true
left join lateral (
  select jsonb_build_object('slug',x.account_type_slug,'label',x.label,'accounts',x.accounts,'reported_purchase_value',x.value) value
  from (select pr.account_type_slug,pr.label,min(pr.sort_order) sort_order,sum(pr.quantity)::bigint accounts,sum(pr.total_amount)::numeric(16,2) value
    from public.purchase_product_rows pr join public.purchases px on px.id=pr.purchase_id
    where pr.seller_id=s.id and px.moderation_status='approved' and px.loss_status='open' and px.unresolved_amount>0 group by pr.account_type_slug,pr.label) x
  order by x.accounts desc,x.value desc,x.sort_order,x.label limit 1
) primary_type on true
where s.status='active' group by s.id,s.username,s.normalized_username,s.avatar_path,s.avatar_updated_at,types.labels,types.breakdown,primary_type.value;

create or replace view public.platform_loss_statistics as
select coalesce(sum(p.unresolved_amount),0)::numeric(16,2) unresolved_amount,count(p.id)::bigint report_count,count(distinct p.seller_id)::bigint visible_sellers,
  coalesce(sum(rv.reported_purchase_value),0)::numeric(16,2) reported_purchase_value,coalesce(sum(rv.accounts_reported_purchased),0)::bigint accounts_reported_purchased
from public.purchases p join public.sellers s on s.id=p.seller_id join public.purchase_report_values rv on rv.id=p.id
where p.moderation_status='approved' and p.loss_status='open' and p.unresolved_amount>0 and s.status='active';

create or replace view public.public_loss_rows as
select p.id,p.seller_id,s.username,s.normalized_username,p.purchase_date,p.quantity,p.unit_price,
  rv.reported_purchase_value total_amount,p.unresolved_amount,p.loss_issue,p.created_at,
  coalesce((select array_agg(distinct coalesce(pi.custom_label,a.label) order by coalesce(pi.custom_label,a.label)) from public.purchase_items pi join public.account_types a on a.slug=pi.account_type_slug where pi.purchase_id=p.id),
    (select array_agg(coalesce(pat.custom_label,a.label) order by a.sort_order,a.label) from public.purchase_account_types pat join public.account_types a on a.slug=pat.account_type_slug where pat.purchase_id=p.id),'{}'::text[]) account_types,
  rv.items,rv.accounts_reported_purchased,rv.reported_purchase_value
from public.purchases p join public.sellers s on s.id=p.seller_id join public.purchase_report_values rv on rv.id=p.id
where p.moderation_status='approved' and p.loss_status='open' and p.unresolved_amount>0 and s.status='active';

create or replace function public.get_public_overview() returns jsonb language sql stable security definer set search_path=pg_catalog,public as $$
select jsonb_build_object('totals',coalesce((select to_jsonb(t) from public.platform_loss_statistics t limit 1),jsonb_build_object('unresolved_amount','0.00','report_count',0,'visible_sellers',0,'reported_purchase_value','0.00','accounts_reported_purchased',0)),
 'leaders',coalesce((select jsonb_agg(to_jsonb(s) order by s.unresolved_amount desc,s.normalized_username) from (select * from public.seller_loss_statistics order by unresolved_amount desc,normalized_username limit 100)s),'[]'),
 'recent',coalesce((select jsonb_agg(to_jsonb(r) order by r.created_at desc,r.id desc) from (select * from public.public_loss_rows order by created_at desc,id desc limit 20)r),'[]'));$$;
create or replace function public.search_public_sellers(p_search text) returns jsonb language sql stable security definer set search_path=pg_catalog,public as $$
select coalesce(jsonb_agg(to_jsonb(s) order by s.normalized_username),'[]') from (select * from public.seller_loss_statistics where normalized_username like lower(regexp_replace(left(coalesce(p_search,''),64),'[^a-z0-9._-]','','g'))||'%' order by normalized_username limit 8)s;$$;
create or replace function public.get_public_seller(p_handle text) returns jsonb language plpgsql stable security definer set search_path=pg_catalog,public as $$
declare v_handle text:=lower(regexp_replace(trim(p_handle),'^@+',''));v_seller public.seller_loss_statistics%rowtype;v_redirect text;
begin select * into v_seller from public.seller_loss_statistics where normalized_username=v_handle limit 1;if found then return jsonb_build_object('seller',to_jsonb(v_seller),'reports',coalesce((select jsonb_agg(to_jsonb(r) order by r.created_at desc,r.id desc) from (select * from public.public_loss_rows where seller_id=v_seller.id order by created_at desc,id desc limit 100)r),'[]'));end if;
select target.normalized_username into v_redirect from public.sellers source join public.sellers target on target.id=source.merged_into where source.normalized_username=v_handle and source.status='merged' limit 1;if v_redirect is not null then return jsonb_build_object('redirect',v_redirect);end if;return null;end $$;
create or replace function public.get_public_record(p_id uuid) returns jsonb language sql stable security definer set search_path=pg_catalog,public as $$select to_jsonb(r) from public.public_loss_rows r where r.id=p_id limit 1;$$;

revoke all on public.purchase_report_values,public.purchase_product_rows,public.seller_loss_statistics,public.platform_loss_statistics,public.public_loss_rows from anon,authenticated;
grant select on public.purchase_report_values,public.purchase_product_rows,public.seller_loss_statistics,public.platform_loss_statistics,public.public_loss_rows to service_role;
revoke all on function public.submit_loss_report_secure_v3(text,text,jsonb,text,text,uuid,text,text,text,boolean),public.set_purchase_items_secure(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.submit_loss_report_secure_v3(text,text,jsonb,text,text,uuid,text,text,text,boolean),public.set_purchase_items_secure(uuid,jsonb) to service_role;
revoke all on function public.get_public_overview(),public.search_public_sellers(text),public.get_public_seller(text),public.get_public_record(uuid) from public,authenticated;
grant execute on function public.get_public_overview(),public.search_public_sellers(text),public.get_public_seller(text),public.get_public_record(uuid) to anon,service_role;

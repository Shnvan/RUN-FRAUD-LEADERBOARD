-- Add reviewed purchase totals to the public hall and leaderboard.
-- Values include approved reports that remain open with an unresolved balance.
create or replace view public.seller_loss_statistics as
select s.id,s.username,s.normalized_username,
  coalesce(sum(p.unresolved_amount),0)::numeric(16,2) unresolved_amount,
  count(p.id)::bigint report_count,
  coalesce((select array_agg(distinct coalesce(pat.custom_label,a.label) order by coalesce(pat.custom_label,a.label))
    from public.purchases p2
    join public.purchase_account_types pat on pat.purchase_id=p2.id
    join public.account_types a on a.slug=pat.account_type_slug
    where p2.seller_id=s.id and p2.moderation_status='approved' and p2.loss_status='open' and p2.unresolved_amount>0),'{}'::text[]) account_types,
  (s.avatar_path is not null) has_avatar,s.avatar_updated_at,
  coalesce(sum(p.total_amount),0)::numeric(16,2) reported_purchase_value,
  coalesce(sum(p.quantity),0)::bigint accounts_reported_purchased
from public.sellers s
join public.purchases p on p.seller_id=s.id and p.moderation_status='approved' and p.loss_status='open' and p.unresolved_amount>0
where s.status='active'
group by s.id,s.username,s.normalized_username,s.avatar_path,s.avatar_updated_at;

create or replace view public.platform_loss_statistics as
select coalesce(sum(p.unresolved_amount),0)::numeric(16,2) unresolved_amount,
  count(p.id)::bigint report_count,
  count(distinct p.seller_id)::bigint visible_sellers,
  coalesce(sum(p.total_amount),0)::numeric(16,2) reported_purchase_value,
  coalesce(sum(p.quantity),0)::bigint accounts_reported_purchased
from public.purchases p
join public.sellers s on s.id=p.seller_id
where p.moderation_status='approved' and p.loss_status='open' and p.unresolved_amount>0 and s.status='active';

create or replace function public.get_public_overview() returns jsonb language sql stable security definer set search_path=pg_catalog,public as $$
select jsonb_build_object(
  'totals',coalesce((select to_jsonb(t) from public.platform_loss_statistics t limit 1),jsonb_build_object('unresolved_amount','0.00','report_count',0,'visible_sellers',0,'reported_purchase_value','0.00','accounts_reported_purchased',0)),
  'leaders',coalesce((select jsonb_agg(to_jsonb(s) order by s.unresolved_amount desc,s.normalized_username asc) from (select * from public.seller_loss_statistics order by unresolved_amount desc,normalized_username asc limit 100) s),'[]'::jsonb),
  'recent',coalesce((select jsonb_agg(to_jsonb(r) order by r.created_at desc,r.id desc) from (select * from public.public_loss_rows order by created_at desc,id desc limit 20) r),'[]'::jsonb)
);$$;

create or replace function public.search_public_sellers(p_search text) returns jsonb language sql stable security definer set search_path=pg_catalog,public as $$
select coalesce(jsonb_agg(to_jsonb(s) order by s.normalized_username),'[]'::jsonb)
from (select id,username,normalized_username,unresolved_amount,report_count,account_types,has_avatar,avatar_updated_at,reported_purchase_value,accounts_reported_purchased
  from public.seller_loss_statistics
  where normalized_username like lower(regexp_replace(left(coalesce(p_search,''),64),'[^a-z0-9._-]','','g'))||'%'
  order by normalized_username limit 8) s;$$;

revoke all on public.seller_loss_statistics,public.platform_loss_statistics from anon,authenticated;
grant select on public.seller_loss_statistics,public.platform_loss_statistics to service_role;
revoke all on function public.get_public_overview(),public.search_public_sellers(text) from public,authenticated;
grant execute on function public.get_public_overview(),public.search_public_sellers(text) to anon,service_role;

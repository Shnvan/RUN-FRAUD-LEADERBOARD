create or replace view public.seller_statistics as
select s.id,s.username,s.normalized_username,
  coalesce(sum(p.total_amount),0)::numeric(16,2) as reported_sales,
  coalesce(sum(p.quantity),0)::bigint as accounts_sold,
  count(p.id)::bigint as recorded_purchases,
  case when sum(p.quantity)>0 then (sum(p.total_amount)/sum(p.quantity))::numeric(12,2) end as average_price,
  (select x.unit_price from public.purchases x where x.seller_id=s.id and x.moderation_status='approved'
   order by x.purchase_date desc,x.created_at desc,x.id desc limit 1) as latest_price
from public.sellers s left join public.purchases p on p.seller_id=s.id and p.moderation_status='approved'
where s.status='active'
group by s.id,s.username,s.normalized_username;

create or replace view public.public_purchase_rows as
select p.id,p.seller_id,s.username,s.normalized_username,p.purchase_date,p.quantity,
  p.unit_price,p.total_amount,p.created_at
from public.purchases p join public.sellers s on s.id=p.seller_id
where p.moderation_status='approved' and s.status='active';

revoke all on public.seller_statistics from anon,authenticated;
revoke all on public.public_purchase_rows from anon,authenticated;
grant select on public.seller_statistics to service_role;
grant select on public.public_purchase_rows to service_role;

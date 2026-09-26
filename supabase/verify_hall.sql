-- Run after 010_hall_metrics.sql. All fixture data is rolled back.
begin;

do $$
declare
  active_seller uuid:=gen_random_uuid();
  suspended_seller uuid:=gen_random_uuid();
  first_purchase uuid:=gen_random_uuid();
  stats record;
  totals record;
begin
  insert into public.sellers(id,username,normalized_username,status) values
    (active_seller,'hall-check-active-'||left(active_seller::text,8),'hall-check-active-'||left(active_seller::text,8),'active'),
    (suspended_seller,'hall-check-suspended-'||left(suspended_seller::text,8),'hall-check-suspended-'||left(suspended_seller::text,8),'suspended');

  insert into public.purchases(id,seller_id,purchase_date,quantity,unit_price,moderation_status,loss_issue,loss_details,reported_unresolved_amount,unresolved_amount,loss_status,idempotency_key,submitter_fingerprint,duplicate_key) values
    (first_purchase,active_seller,current_date,2,100,'approved','refund_not_received','Verification fixture one',150,150,'open',gen_random_uuid(),repeat('a',64),repeat('b',64)),
    (gen_random_uuid(),active_seller,current_date,3,200,'approved','not_delivered','Verification fixture two',400,400,'open',gen_random_uuid(),repeat('c',64),repeat('d',64)),
    (gen_random_uuid(),active_seller,current_date,10,999,'pending','not_delivered','Pending fixture excluded',9990,9990,'open',gen_random_uuid(),repeat('e',64),repeat('f',64)),
    (gen_random_uuid(),active_seller,current_date,7,50,'approved','refund_not_received','Resolved fixture excluded',350,0,'resolved',gen_random_uuid(),repeat('1',64),repeat('2',64)),
    (gen_random_uuid(),suspended_seller,current_date,20,500,'approved','not_delivered','Suspended fixture excluded',10000,10000,'open',gen_random_uuid(),repeat('3',64),repeat('4',64));

  insert into public.purchase_account_types(purchase_id,account_type_slug) values
    (first_purchase,'chatgpt'),(first_purchase,'claude');

  select * into stats from public.seller_loss_statistics where id=active_seller;
  if stats.reported_purchase_value<>800 or stats.accounts_reported_purchased<>5 or stats.unresolved_amount<>550 or stats.report_count<>2 then
    raise exception 'seller hall aggregation mismatch: %',to_jsonb(stats);
  end if;
  if cardinality(stats.account_types)<>2 then raise exception 'account labels missing or duplicated';end if;
  if exists(select 1 from public.seller_loss_statistics where id=suspended_seller) then raise exception 'suspended seller leaked';end if;

  select * into totals from public.platform_loss_statistics;
  if totals.reported_purchase_value<800 or totals.accounts_reported_purchased<5 or totals.unresolved_amount<550 then
    raise exception 'platform hall aggregation missing fixture values';
  end if;
end $$;

rollback;

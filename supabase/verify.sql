-- Run after migrations in a test Supabase project. The transaction rolls back.
begin;
do $$
declare sid uuid := gen_random_uuid(); result record; before_sales numeric; before_count bigint;
begin
  select reported_sales,recorded_purchases into before_sales,before_count from public.platform_statistics;
  insert into public.sellers(id,username,normalized_username,status) values(sid,'test_price_history','test_price_history','active');
  insert into public.purchases(seller_id,purchase_date,quantity,unit_price,idempotency_key,submitter_fingerprint,duplicate_key,moderation_status)
  values(sid,date '2026-09-22',2,1500,gen_random_uuid(),repeat('a',64),repeat('b',64),'approved'),
        (sid,date '2026-09-24',3,1000,gen_random_uuid(),repeat('a',64),repeat('c',64),'approved'),
        (sid,date '2026-09-25',9,999999,gen_random_uuid(),repeat('a',64),repeat('d',64),'pending');
  select * into result from public.seller_statistics where id=sid;
  if result.reported_sales <> 6000 or result.accounts_sold <> 5 or result.recorded_purchases <> 2
    or result.latest_price <> 1000 or result.average_price <> 1200 then raise exception 'aggregate test failed'; end if;
  if (select count(*) from public.public_purchase_rows where seller_id=sid) <> 2 then raise exception 'pending record leaked'; end if;
  if (select reported_sales from public.platform_statistics) <> before_sales + 6000.00 then raise exception 'platform total incorrect'; end if;
  if (select recorded_purchases from public.platform_statistics) <> before_count + 2 then raise exception 'platform count incorrect'; end if;
  if (select total_amount from public.purchases where seller_id=sid and purchase_date=date '2026-09-22') <> 3000 then raise exception 'historical total changed'; end if;
end $$;
rollback;

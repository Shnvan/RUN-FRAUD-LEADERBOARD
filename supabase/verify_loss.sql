-- Run after 005_buyer_username.sql in a test project. All changes roll back.
begin;
do $$
declare alpha uuid:=gen_random_uuid(); beta uuid:=gen_random_uuid();
  alpha_report uuid; beta_report uuid; pending_report uuid; legacy_report uuid;
  idem uuid:=gen_random_uuid(); first_submit uuid; repeated_submit uuid; duplicate_submit uuid;
  first_handle text; amount numeric; duplicate_flags text[]; i integer;
begin
  insert into public.sellers(id,username,normalized_username,status) values
    (alpha,'verify_loss_alpha','verify_loss_alpha','active'),
    (beta,'verify_loss_beta','verify_loss_beta','active');
  insert into public.purchases(seller_id,purchase_date,quantity,unit_price,loss_issue,loss_details,
    reported_unresolved_amount,unresolved_amount,loss_status,idempotency_key,submitter_fingerprint,duplicate_key,moderation_status)
    values(alpha,current_date,2,10.25,'not_delivered','Accounts were not delivered.',20.50,20.50,'open',gen_random_uuid(),repeat('a',64),repeat('b',64),'approved')
    returning id into alpha_report;
  insert into public.purchases(seller_id,purchase_date,quantity,unit_price,loss_issue,loss_details,
    reported_unresolved_amount,unresolved_amount,loss_status,idempotency_key,submitter_fingerprint,duplicate_key,moderation_status)
    values(beta,current_date,1,20.50,'refund_not_received','Refund has not arrived.',20.50,20.50,'open',gen_random_uuid(),repeat('c',64),repeat('d',64),'approved')
    returning id into beta_report;
  insert into public.purchases(seller_id,purchase_date,quantity,unit_price,loss_issue,loss_details,
    reported_unresolved_amount,unresolved_amount,loss_status,idempotency_key,submitter_fingerprint,duplicate_key,moderation_status)
    values(alpha,current_date,1,1000,'not_delivered','Pending evidence review.',1000,1000,'open',gen_random_uuid(),repeat('e',64),repeat('f',64),'pending')
    returning id into pending_report;
  insert into public.purchases(seller_id,purchase_date,quantity,unit_price,idempotency_key,submitter_fingerprint,duplicate_key,moderation_status)
    values(alpha,current_date,1,999,gen_random_uuid(),repeat('g',64),repeat('h',64),'approved') returning id into legacy_report;
  select normalized_username into first_handle from public.seller_loss_statistics
    where id in (alpha,beta) order by unresolved_amount desc,normalized_username asc limit 1;
  if first_handle<>'verify_loss_alpha' then raise exception 'stable tie ranking failed'; end if;
  if (select count(*) from public.public_loss_rows where id in (alpha_report,beta_report,pending_report,legacy_report))<>2
    then raise exception 'pending or purchase-only record leaked'; end if;
  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='public_loss_rows'
    and column_name in ('buyer_username','loss_details','evidence_path','submitter_fingerprint')) then raise exception 'private field leaked'; end if;
  begin
    perform public.submit_loss_report_with_buyer('verify_new_handle','<invalid>',current_date-1,1,30,20,'not_delivered',
      'Order never arrived.',gen_random_uuid(),repeat('x',64),repeat('y',64),null);
    raise exception 'buyer username validation failed';
  exception when others then
    if sqlerrm<>'invalid_buyer_username' then raise; end if;
  end;
  select public.submit_loss_report_with_buyer('verify_new_handle','verify_buyer',current_date-1,1,30,20,'not_delivered',
    'Order never arrived.',idem,repeat('x',64),repeat('y',64),null) into first_submit;
  select public.submit_loss_report_with_buyer('verify_new_handle','verify_buyer',current_date-1,1,30,20,'not_delivered',
    'Order never arrived.',idem,repeat('x',64),repeat('y',64),null) into repeated_submit;
  if first_submit<>repeated_submit then raise exception 'idempotency failed'; end if;
  if (select buyer_username from public.purchases where id=first_submit)<>'verify_buyer' then raise exception 'buyer username missing'; end if;
  select public.submit_loss_report_with_buyer('verify_new_handle','verify_buyer',current_date-1,1,30,20,'not_delivered',
    'Order never arrived.',gen_random_uuid(),repeat('x',64),repeat('y',64),null) into duplicate_submit;
  select flags into duplicate_flags from public.purchases where id=duplicate_submit;
  if not ('possible_duplicate'=any(duplicate_flags)) then raise exception 'duplicate not flagged'; end if;
  for i in 1..3 loop
    perform public.submit_loss_report_with_buyer('verify_new_handle','verify_buyer',current_date-1,1,30,20,'not_delivered',
      'Order never arrived.',gen_random_uuid(),repeat('x',64),repeat('z',64),null);
  end loop;
  begin
    perform public.submit_loss_report_with_buyer('verify_new_handle','verify_buyer',current_date-1,1,30,20,'not_delivered',
      'Order never arrived.',gen_random_uuid(),repeat('x',64),repeat('z',64),null);
    raise exception 'rate limit failed';
  exception when others then
    if sqlerrm<>'rate_limited' then raise; end if;
  end;
  perform public.adjust_unresolved_loss(alpha_report,5.25,'verification');
  select unresolved_amount into amount from public.seller_loss_statistics where id=alpha;
  if amount<>5.25 then raise exception 'adjusted amount not reflected'; end if;
  perform public.merge_sellers(alpha,beta,'verification');
  select unresolved_amount into amount from public.seller_loss_statistics where id=beta;
  if amount<>25.75 then raise exception 'merged amount incorrect'; end if;
  perform public.adjust_unresolved_loss(beta_report,0,'verification');
  if (select count(*) from public.public_loss_rows where id=beta_report)<>0 then raise exception 'resolved report leaked'; end if;
  perform public.retract_purchase(alpha_report,'verification');
  if (select count(*) from public.public_loss_rows where id=alpha_report)<>0 then raise exception 'retracted report leaked'; end if;
  if (select count(*) from public.moderation_audit where actor='verification')<>4 then raise exception 'audit missing'; end if;
end $$;
rollback;

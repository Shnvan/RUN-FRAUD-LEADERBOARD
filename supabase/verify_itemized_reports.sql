-- Read-only checks after applying 011_itemized_reports_and_product_branding.sql.
select to_regclass('public.purchase_items') as purchase_items_table;
select relrowsecurity as purchase_items_rls from pg_class where oid='public.purchase_items'::regclass;
select routine_name from information_schema.routines where routine_schema='public' and routine_name in ('submit_loss_report_secure_v3','set_purchase_items_secure') order by routine_name;
select has_function_privilege('anon','public.submit_loss_report_secure_v3(text,text,jsonb,text,text,uuid,text,text,text,boolean)','execute') as anon_can_submit_v3,
       has_function_privilege('service_role','public.submit_loss_report_secure_v3(text,text,jsonb,text,text,uuid,text,text,text,boolean)','execute') as service_can_submit_v3;
select count(*) filter(where is_itemized) itemized_reports,
       count(*) filter(where is_itemized and (purchase_date is not null or quantity is not null or unit_price is not null)) malformed_itemized_parents
from public.purchases;
select count(*) orphan_items from public.purchase_items i left join public.purchases p on p.id=i.purchase_id where p.id is null;
select count(*) invalid_item_counts from (select purchase_id,count(*) n from public.purchase_items group by purchase_id having count(*) not between 1 and 8) x;
select id,reported_purchase_value,accounts_reported_purchased,jsonb_array_length(items) item_count
from public.purchase_report_values order by id limit 20;
select id,primary_account_type,account_type_breakdown from public.seller_loss_statistics order by unresolved_amount desc,normalized_username limit 20;

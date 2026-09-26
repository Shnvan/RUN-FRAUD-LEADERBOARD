do $$
begin
  if not exists(select 1 from pg_tables where schemaname='public' and tablename='account_types' and rowsecurity) then raise exception 'account_types RLS missing';end if;
  if not exists(select 1 from pg_tables where schemaname='public' and tablename='purchase_account_types' and rowsecurity) then raise exception 'purchase_account_types RLS missing';end if;
  if (select count(*) from public.account_types where active)<>9 then raise exception 'account type seed mismatch';end if;
  if not exists(select 1 from pg_proc where pronamespace='public'::regnamespace and proname='submit_loss_report_secure_v2') then raise exception 'v2 RPC missing';end if;
  if not exists(select 1 from storage.buckets where id='seller-profile-images' and public=false) then raise exception 'private seller image bucket missing';end if;
  if has_table_privilege('anon','public.account_types','SELECT') or has_table_privilege('anon','public.purchase_account_types','SELECT') then raise exception 'anonymous table access detected';end if;
end $$;

select slug,label,active from public.account_types order by sort_order;
select id,public,file_size_limit,allowed_mime_types from storage.buckets where id='seller-profile-images';

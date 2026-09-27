-- Remove the obsolete submission RPC after v3 has been verified in production.
-- Keep the exact argument list so overloaded functions cannot be left behind.
revoke all on function public.submit_loss_report_secure_v2(
  text,text,date,integer,numeric,numeric,text,text,uuid,text,text,text[],text,text,boolean
) from public,anon,authenticated,service_role;

drop function if exists public.submit_loss_report_secure_v2(
  text,text,date,integer,numeric,numeric,text,text,uuid,text,text,text[],text,text,boolean
);

-- Apply only after the application using submit_loss_report_secure_v2 is live and smoke-tested.
revoke all on function public.submit_loss_report_secure(text,text,date,integer,numeric,numeric,text,text,uuid,text,text,text,boolean) from public,anon,authenticated,service_role;
drop function public.submit_loss_report_secure(text,text,date,integer,numeric,numeric,text,text,uuid,text,text,text,boolean);

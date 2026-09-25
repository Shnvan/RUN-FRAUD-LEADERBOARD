create or replace function public.retract_purchase(p_id uuid,p_actor text)
returns void language plpgsql security definer set search_path=public as $$
begin
  update public.purchases set moderation_status='rejected',reviewed_at=now(),reviewed_by=p_actor where id=p_id and moderation_status='approved';
  if not found then raise exception 'record_unavailable'; end if;
  insert into public.moderation_audit(actor,action,target_type,target_id) values(p_actor,'retract','purchase',p_id);
end $$;
create or replace function public.set_seller_status(p_id uuid,p_status text,p_actor text)
returns void language plpgsql security definer set search_path=public as $$
begin
  if p_status not in ('active','suspended') then raise exception 'invalid_status'; end if;
  update public.sellers set status=case when p_status='active' and not exists
    (select 1 from public.purchases where seller_id=p_id and moderation_status='approved')
    then 'pending' else p_status end,updated_at=now() where id=p_id and status <> 'merged';
  if not found then raise exception 'seller_unavailable'; end if;
  insert into public.moderation_audit(actor,action,target_type,target_id) values(p_actor,p_status,'seller',p_id);
end $$;
create or replace function public.resolve_correction(p_id uuid,p_decision text,p_actor text)
returns void language plpgsql security definer set search_path=public as $$
begin
  if p_decision not in ('resolved','dismissed') then raise exception 'invalid_decision'; end if;
  update public.correction_requests set status=p_decision,reviewed_at=now(),reviewed_by=p_actor where id=p_id and status='open';
  if not found then raise exception 'not_open'; end if;
  insert into public.moderation_audit(actor,action,target_type,target_id) values(p_actor,p_decision,'correction',p_id);
end $$;
create or replace function public.block_submitter(p_fingerprint text,p_actor text)
returns void language plpgsql security definer set search_path=public as $$
begin
  if length(p_fingerprint) <> 64 then raise exception 'invalid_fingerprint'; end if;
  insert into public.blocked_fingerprints(fingerprint,reason,blocked_by) values(p_fingerprint,'abusive submissions',p_actor)
    on conflict (fingerprint) do nothing;
  insert into public.moderation_audit(actor,action,target_type,target_key)
    values(p_actor,'block_submitter','fingerprint',left(p_fingerprint,12));
end $$;
create or replace function public.unblock_submitter(p_fingerprint text,p_actor text)
returns void language plpgsql security definer set search_path=public as $$
begin
  delete from public.blocked_fingerprints where fingerprint=p_fingerprint;
  if not found then raise exception 'not_blocked'; end if;
  insert into public.moderation_audit(actor,action,target_type,target_key)
    values(p_actor,'unblock_submitter','fingerprint',left(p_fingerprint,12));
end $$;
revoke all on function public.retract_purchase(uuid,text) from public,anon,authenticated;
revoke all on function public.set_seller_status(uuid,text,text) from public,anon,authenticated;
revoke all on function public.resolve_correction(uuid,text,text) from public,anon,authenticated;
grant execute on function public.retract_purchase(uuid,text) to service_role;
grant execute on function public.set_seller_status(uuid,text,text) to service_role;
grant execute on function public.resolve_correction(uuid,text,text) to service_role;
revoke all on function public.block_submitter(text,text) from public,anon,authenticated;
grant execute on function public.block_submitter(text,text) to service_role;
revoke all on function public.unblock_submitter(text,text) from public,anon,authenticated;
grant execute on function public.unblock_submitter(text,text) to service_role;

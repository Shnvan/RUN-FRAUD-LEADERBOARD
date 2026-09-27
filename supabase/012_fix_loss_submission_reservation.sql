-- Keep a first-time loss submission's flags array non-null.
-- SELECT INTO clears target variables when no reservation row is found, so the
-- initializer alone is insufficient.
create or replace function public.reserve_loss_submission(
  p_fingerprint text,p_content_fingerprint text,p_seller_key text,p_idempotency uuid
) returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare v_existing uuid; v_flags text[]:='{}'; v_reserved_at timestamptz; v_seller text:=lower(regexp_replace(trim(p_seller_key),'^@+',''));
begin
  if p_fingerprint !~ '^[0-9a-f]{64}$' or p_content_fingerprint !~ '^[0-9a-f]{64}$' or p_idempotency is null then raise exception 'invalid_fingerprint'; end if;
  if v_seller !~ '^[a-z0-9._-]{2,64}$' then raise exception 'invalid_handle'; end if;
  select id into v_existing from public.purchases where idempotency_key=p_idempotency;
  if v_existing is not null then return jsonb_build_object('existing_id',v_existing,'flags','[]'::jsonb,'proceed',false); end if;
  perform pg_advisory_xact_lock(hashtextextended('global-submission-rate',0));
  select flags,created_at into v_flags,v_reserved_at from public.submission_events where idempotency_key=p_idempotency and kind='purchase' limit 1 for update;
  if found then
    v_flags:=coalesce(v_flags,'{}');
    if v_reserved_at>now()-interval '2 minutes' then return jsonb_build_object('existing_id',null,'flags',to_jsonb(v_flags),'proceed',false); end if;
    update public.submission_events set fingerprint=p_fingerprint,created_at=now(),flags=v_flags where idempotency_key=p_idempotency;
    return jsonb_build_object('existing_id',null,'flags',to_jsonb(v_flags),'proceed',true);
  end if;
  v_flags:='{}';
  if exists(select 1 from public.blocked_fingerprints where fingerprint=p_fingerprint) then raise exception 'rate_limited'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_fingerprint,0));
  perform pg_advisory_xact_lock(hashtextextended('seller|'||v_seller,0));
  if (select count(*) from public.submission_events where fingerprint=p_fingerprint and kind='purchase' and created_at>now()-interval '1 hour')>=3
    or (select count(*) from public.submission_events where fingerprint=p_fingerprint and kind='purchase' and created_at>now()-interval '1 day')>=10
  then raise exception 'rate_limited'; end if;
  if (select count(*) from public.submission_events where kind in ('purchase','correction') and created_at>now()-interval '1 hour')>=50 then raise exception 'circuit_open'; end if;
  if exists(select 1 from public.purchases where duplicate_key=p_content_fingerprint and created_at>now()-interval '30 days') then v_flags:=array_append(v_flags,'exact_duplicate'); end if;
  if (select count(*) from public.submission_events where seller_key=v_seller and kind='purchase' and created_at>now()-interval '1 hour')>=5 then v_flags:=array_append(v_flags,'seller_burst'); end if;
  insert into public.submission_events(fingerprint,kind,seller_key,content_fingerprint,idempotency_key,flags)
    values(p_fingerprint,'purchase',v_seller,p_content_fingerprint,p_idempotency,v_flags);
  return jsonb_build_object('existing_id',null,'flags',to_jsonb(v_flags),'proceed',true);
end $$;

revoke all on function public.reserve_loss_submission(text,text,text,uuid) from public,anon,authenticated;
grant execute on function public.reserve_loss_submission(text,text,text,uuid) to service_role;

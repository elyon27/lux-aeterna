create or replace function public.lux_delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_user_id uuid := auth.uid();
  claims jsonb := auth.jwt();
begin
  -- Accept only a recent password sign-in tied to a session that still exists.
  if target_user_id is null or not exists (
    select 1 from auth.sessions s
    where s.user_id = target_user_id
      and s.id::text = claims ->> 'session_id'
      and s.created_at >= statement_timestamp() - interval '5 minutes'
      and claims -> 'amr' @> '[{"method":"password"}]'::jsonb
  ) then
    raise exception 'Sign in with your password again before deleting your account.'
      using errcode = '42501';
  end if;

  -- Memorials and their photos, prayers and candles are removed by cascading FKs.
  -- Supabase blocks deletion of a user who owns Storage objects.
  delete from auth.users u where u.id = target_user_id;
  if not found then
    raise exception 'Account no longer exists.' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.lux_delete_my_account() from public, anon, authenticated;
grant execute on function public.lux_delete_my_account() to authenticated;

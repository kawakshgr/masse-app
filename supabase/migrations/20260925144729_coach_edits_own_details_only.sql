-- A coach may edit her own name, phone and coaching rules, and nothing else
-- on her row.
--
-- coaches_update_self lets `id = auth.uid()` through for the whole row, so a
-- suspended coach could clear her own suspended_at. RLS is row-level; this
-- trigger says which columns. Platform admins (who suspend and restore) and
-- SECURITY DEFINER functions pass untouched.

alter table public.coaches add column phone text;

create or replace function private.coach_self_update_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  editable constant text[] := array[
    'name', 'first_name', 'pronoun', 'phone', 'check_in_due_offset'
  ];
begin
  if current_user = 'authenticated'
     and new.id = (select auth.uid())
     and not private.is_platform_admin()
     and (to_jsonb(new) - editable) is distinct from (to_jsonb(old) - editable)
  then
    raise exception 'a coach may only edit her own details'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke all on function private.coach_self_update_guard() from anon, public;

drop trigger if exists coaches_self_update_guard on public.coaches;
create trigger coaches_self_update_guard
  before update on public.coaches
  for each row execute function private.coach_self_update_guard();

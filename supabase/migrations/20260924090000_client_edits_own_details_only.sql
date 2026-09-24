-- A client may correct her own details, and nothing else on her row.
--
-- clients_update has always let `id = auth.uid()` through, for the whole row.
-- That meant a client could rewrite her coach_id, her status, her step target
-- and the coach's own file note. RLS is row-level; it cannot say which columns,
-- so this trigger does.
--
-- It only bites on a direct write by the client herself. The coach editing her
-- client (auth.uid() = coach_id) and SECURITY DEFINER functions (current_user
-- is the owner, not `authenticated`) pass untouched.

create or replace function private.client_self_update_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  -- What a client may change about herself. Everything else on the row is the
  -- coach's to write.
  editable constant text[] := array[
    'first_name', 'name', 'phone', 'birth_date', 'height_cm',
    'occupation', 'emergency_contact'
  ];
begin
  if current_user = 'authenticated'
     and new.id = (select auth.uid())
     and old.coach_id is distinct from (select auth.uid())
     and (to_jsonb(new) - editable) is distinct from (to_jsonb(old) - editable)
  then
    raise exception 'a client may only edit her own details'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists clients_self_update_guard on public.clients;
create trigger clients_self_update_guard
  before update on public.clients
  for each row execute function private.client_self_update_guard();

-- The client's "this week" header carries the block label, so she needs the
-- programme row — but only for a programme that has actually reached her.
create or replace function private.programme_is_pushed_to_me(p_programme uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.programme_weeks w
    join public.assignments a on a.week_id = w.id
    where w.programme_id = p_programme
      and a.client_id = (select auth.uid())
      and a.pushed_at is not null
  );
$$;

revoke all     on function private.programme_is_pushed_to_me(uuid) from anon, public;
grant  execute on function private.programme_is_pushed_to_me(uuid) to authenticated;

create policy programmes_select_pushed on public.programmes for select to authenticated
  using (private.programme_is_pushed_to_me(id));

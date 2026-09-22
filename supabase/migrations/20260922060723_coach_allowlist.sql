-- Becoming a coach is now by invitation of the platform, not by signing in.
--
-- Auth signup itself stays open, because a client must be able to create an
-- account to claim her invite code. What is gated is the coaches row: without
-- one, a signed-in stranger reaches nothing.

create table public.allowed_coach_emails (
  email    text primary key,
  note     text,
  added_at timestamptz not null default now(),
  added_by uuid references auth.users(id) on delete set null,
  constraint allowed_coach_emails_shape check (email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$')
);

alter table public.allowed_coach_emails enable row level security;
revoke all on public.allowed_coach_emails from anon;

-- Normalised lookup, so case and stray spaces cannot open a door.
create or replace function private.email_may_coach(p_email text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.allowed_coach_emails a
    where lower(btrim(a.email)) = lower(btrim(coalesce(p_email, '')))
  );
$$;

revoke all     on function private.email_may_coach(text) from anon, public;
grant  execute on function private.email_may_coach(text) to authenticated;

-- The one the app asks before it shows the welcome form.
create or replace function public.may_become_coach()
returns boolean language sql stable security definer set search_path = public as $$
  select private.email_may_coach((select auth.jwt() ->> 'email'));
$$;

revoke all     on function public.may_become_coach() from anon, public;
grant  execute on function public.may_become_coach() to authenticated;

-- Replace self-registration with allowlisted registration.
drop policy coaches_insert_self on public.coaches;

create policy coaches_insert_allowlisted on public.coaches for insert to authenticated
  with check (
    id = (select auth.uid())
    and private.email_may_coach((select auth.jwt() ->> 'email'))
  );

-- Platform admins curate the list, so this never needs a migration again.
create policy allowlist_select_by_admin on public.allowed_coach_emails
  for select to authenticated using (private.is_platform_admin());

create policy allowlist_insert_by_admin on public.allowed_coach_emails
  for insert to authenticated with check (private.is_platform_admin());

create policy allowlist_delete_by_admin on public.allowed_coach_emails
  for delete to authenticated using (private.is_platform_admin());

insert into public.allowed_coach_emails (email, note) values
  ('cordeiro.kevin@gmail.com', 'Owner'),
  ('lucie.merlet2@gmail.com',  'Coach')
on conflict (email) do nothing;

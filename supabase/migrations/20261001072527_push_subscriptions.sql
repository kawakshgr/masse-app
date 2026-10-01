-- Web push (1 Oct 2026): one row per device that said yes. Holds only what
-- the browser hands over to deliver a notification, and the language to
-- write it in. Erased with the account (cascade).
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  locale text not null default 'fr' check (locale in ('fr', 'en')),
  created_at timestamptz not null default now()
);

create index push_subscriptions_user_id_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

create policy push_subscriptions_own on public.push_subscriptions
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

grant select, insert, update, delete on public.push_subscriptions to authenticated, service_role;
revoke all on public.push_subscriptions from anon;

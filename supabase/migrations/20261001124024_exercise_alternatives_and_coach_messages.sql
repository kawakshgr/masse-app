-- Stand-ins (1 Oct 2026): up to three movements the coach accepts in place
-- of one, when the machine is taken. Names, as the movement's own name is.
alter table public.session_exercises
  add column alternatives text[] not null default '{}'
  check (cardinality(alternatives) <= 3);

-- The movement a set was really done as, when it was a stand-in. Null: the
-- movement written. History and records read done_as before the name.
alter table public.set_logs
  add column done_as text
  check (done_as is null or char_length(done_as) between 1 and 120);

-- The coach's own wording for the WhatsApp messages Masse writes for her
-- (1 Oct 2026). One row per message she changed; none, the default text.
-- Placeholders in braces ({first}, {amount}…) are filled when the message
-- is written.
create table public.coach_messages (
  coach_id uuid not null references public.coaches (id) on delete cascade,
  kind text not null check (kind in (
    'late', 'silent', 'missed', 'sleep', 'pain', 'unpaid',
    'callOffer', 'callConfirm', 'callCancel', 'welcome', 'decline'
  )),
  body text not null check (char_length(body) between 1 and 1000),
  updated_at timestamptz not null default now(),
  primary key (coach_id, kind)
);

alter table public.coach_messages enable row level security;

create policy coach_messages_own on public.coach_messages
  for all to authenticated
  using (coach_id = (select auth.uid()))
  with check (coach_id = (select auth.uid()));

grant select, insert, update, delete on public.coach_messages to authenticated, service_role;
revoke all on public.coach_messages from anon;

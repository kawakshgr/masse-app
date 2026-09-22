-- Per-phase levers the coach sets for one client, instead of the fixed
-- coefficients that were compiled into the derivation functions.
--
-- These are programming settings, not cycle data: no dates live here. The
-- handoff's numbers stay as the defaults, so a client with no rows behaves
-- exactly as before and nothing already written changes meaning.

create type public.cycle_mode as enum ('log', 'manual');

alter table public.clients
  add column cycle_mode public.cycle_mode not null default 'log',
  -- Used only when cycle_mode = 'manual': the coach names the phase herself.
  add column cycle_phase_manual public.cycle_phase;

create table public.cycle_adjustments (
  client_id     uuid not null references public.clients(id) on delete cascade,
  phase         public.cycle_phase not null,
  load_pct      int not null default 0,
  rpe_cap       numeric(3,1),
  sets_delta    int not null default 0,
  kcal_delta    int not null default 0,
  carbs_g_delta int not null default 0,
  primary key (client_id, phase),
  constraint cycle_adjustments_load_sane  check (load_pct between -50 and 50),
  constraint cycle_adjustments_sets_sane  check (sets_delta between -5 and 5),
  constraint cycle_adjustments_rpe_sane   check (rpe_cap is null or rpe_cap between 5 and 10)
);

alter table public.cycle_adjustments enable row level security;
revoke all on public.cycle_adjustments from anon;

-- The coach sets the levers; the client reads what is being applied to her.
create policy cycle_adjustments_by_coach on public.cycle_adjustments for all to authenticated
  using (private.owns_client(client_id)) with check (private.owns_client(client_id));

create policy cycle_adjustments_read_own on public.cycle_adjustments for select to authenticated
  using (client_id = (select auth.uid()));

/* ---------- the contract both clients read ---------- */

-- Columns are added, never renamed or removed: anything already reading
-- phase, intensity_coefficient and volume_coefficient keeps working.
drop function if exists public.client_cycle_state(uuid, date);

create or replace function public.client_cycle_state(
  p_client uuid,
  p_on     date default current_date
) returns table (
  phase                 public.cycle_phase,
  intensity_coefficient numeric,
  volume_coefficient    numeric,
  load_pct              int,
  rpe_cap               numeric,
  sets_delta            int,
  kcal_delta            int,
  carbs_g_delta         int,
  configured            boolean
)
language plpgsql stable security definer
set search_path = public
as $$
declare
  v_allowed  boolean;
  v_tracking boolean;
  v_mode     public.cycle_mode;
  v_manual   public.cycle_phase;
  v_phase    public.cycle_phase;
  v_adj      public.cycle_adjustments%rowtype;
begin
  select (c.id = (select auth.uid()) or c.coach_id = (select auth.uid())),
         c.cycle_tracking, c.cycle_mode, c.cycle_phase_manual
    into v_allowed, v_tracking, v_mode, v_manual
  from public.clients c
  where c.id = p_client;

  if not coalesce(v_allowed, false) or not coalesce(v_tracking, false) then
    return;
  end if;

  if v_mode = 'manual' then
    v_phase := v_manual;
  else
    select public.cycle_phase_on(cl.period_start_date, cl.cycle_length_days, p_on)
      into v_phase
    from public.cycle_logs cl
    where cl.client_id = p_client
      and cl.period_start_date <= p_on
    order by cl.period_start_date desc
    limit 1;
  end if;

  if v_phase is null then
    return;
  end if;

  select * into v_adj
  from public.cycle_adjustments a
  where a.client_id = p_client and a.phase = v_phase;

  if found then
    -- Configured: the coach's own numbers, and sets_delta carries volume
    -- explicitly rather than hiding it in a coefficient.
    return query select
      v_phase,
      1 + (v_adj.load_pct::numeric / 100),
      1::numeric,
      v_adj.load_pct,
      v_adj.rpe_cap,
      v_adj.sets_delta,
      v_adj.kcal_delta,
      v_adj.carbs_g_delta,
      true;
  else
    -- Unconfigured: the handoff's defaults, unchanged.
    return query select
      v_phase,
      public.load_intensity_coefficient(v_phase),
      public.load_volume_coefficient(v_phase),
      round((public.load_intensity_coefficient(v_phase) - 1) * 100)::int,
      null::numeric,
      0,
      0,
      0,
      false;
  end if;
end;
$$;

revoke execute on function public.client_cycle_state(uuid, date) from public, anon;
grant   execute on function public.client_cycle_state(uuid, date) to authenticated;

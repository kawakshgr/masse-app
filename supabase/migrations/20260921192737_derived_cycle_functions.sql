-- Phase and load coefficient are computed server-side, once. Two client-side
-- implementations of the same arithmetic would disagree.

create or replace function public.cycle_day(
  p_period_start date,
  p_cycle_length int,
  p_on           date
) returns int
language sql immutable
as $$
  select case
    when p_period_start is null or p_cycle_length is null or p_cycle_length < 1 then null
    else (((p_on - p_period_start) % p_cycle_length) + p_cycle_length) % p_cycle_length + 1
  end;
$$;

-- Menstrual 1–5, follicular 6–13, ovulatory 14–16, luteal 17–end.
create or replace function public.cycle_phase_on(
  p_period_start date,
  p_cycle_length int,
  p_on           date
) returns public.cycle_phase
language sql immutable
as $$
  select case
    when d.day is null then null
    when d.day <= 5  then 'menstrual'::public.cycle_phase
    when d.day <= 13 then 'follicular'::public.cycle_phase
    when d.day <= 16 then 'ovulatory'::public.cycle_phase
    else 'luteal'::public.cycle_phase
  end
  from (select public.cycle_day(p_period_start, p_cycle_length, p_on) as day) d;
$$;

-- Menstrual −10%, follicular 0%, ovulatory +5%.
-- Luteal trims volume before intensity, so it moves the volume figure, not the weight.
create or replace function public.load_intensity_coefficient(p_phase public.cycle_phase)
returns numeric language sql immutable
as $$
  select case p_phase
    when 'menstrual'  then 0.90
    when 'follicular' then 1.00
    when 'ovulatory'  then 1.05
    when 'luteal'     then 1.00
    else 1.00
  end;
$$;

create or replace function public.load_volume_coefficient(p_phase public.cycle_phase)
returns numeric language sql immutable
as $$
  select case p_phase
    when 'luteal' then 0.90
    else 1.00
  end;
$$;

-- The coach's only door to cycle data. Returns phase and coefficients; never the
-- dates. Raw cycle_logs rows stay unreadable to her (see RLS). Returns no rows
-- when tracking is off — absent, not disabled.
create or replace function public.client_cycle_state(
  p_client uuid,
  p_on     date default current_date
) returns table (
  phase                 public.cycle_phase,
  intensity_coefficient numeric,
  volume_coefficient    numeric
)
language plpgsql stable security definer
set search_path = public
as $$
declare
  v_allowed  boolean;
  v_tracking boolean;
begin
  select (c.id = (select auth.uid()) or c.coach_id = (select auth.uid())), c.cycle_tracking
    into v_allowed, v_tracking
  from public.clients c
  where c.id = p_client;

  if not coalesce(v_allowed, false) or not coalesce(v_tracking, false) then
    return;
  end if;

  return query
  select ph.p,
         public.load_intensity_coefficient(ph.p),
         public.load_volume_coefficient(ph.p)
  from (
    select public.cycle_phase_on(cl.period_start_date, cl.cycle_length_days, p_on) as p
    from public.cycle_logs cl
    where cl.client_id = p_client
      and cl.period_start_date <= p_on
    order by cl.period_start_date desc
    limit 1
  ) ph
  where ph.p is not null;
end;
$$;

revoke execute on function public.client_cycle_state(uuid, date) from public, anon;
grant   execute on function public.client_cycle_state(uuid, date) to authenticated;

-- Keep programmes.updated_at honest.
create or replace function public.touch_updated_at()
returns trigger language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger programmes_touch_updated_at
  before update on public.programmes
  for each row execute function public.touch_updated_at();

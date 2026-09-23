-- Where she is in her cycle, for a client that wants to see it.
--
-- Two additions, and neither invents an opinion the database did not already
-- hold. The phase boundaries stay in cycle_phase_on and nowhere else: this
-- walks that function day by day rather than restating 5 / 13 / 16, because a
-- second copy of those numbers is a second answer waiting to disagree.

create or replace function public.cycle_phase_spans(p_cycle_length int)
returns table (phase public.cycle_phase, first_day int, last_day int)
language sql immutable
as $$
  select p.phase, min(p.day)::int, max(p.day)::int
  from (
    select d as day,
           public.cycle_phase_on('2000-01-01'::date, p_cycle_length,
                                 '2000-01-01'::date + (d - 1)) as phase
    from generate_series(1, greatest(p_cycle_length, 1)) as d
  ) p
  where p.phase is not null
  group by p.phase
  order by min(p.day);
$$;

revoke all     on function public.cycle_phase_spans(int) from anon, public;
grant  execute on function public.cycle_phase_spans(int) to authenticated;

-- The state gains the day and the length, so a client app can place a marker
-- without doing its own date arithmetic. Dropped and recreated because the
-- return shape changes; the existing columns keep their names and positions,
-- so every current caller reads exactly what it read before.
drop function if exists public.client_cycle_state(uuid, date);

create function public.client_cycle_state(
  p_client uuid,
  p_on     date default current_date
) returns table (
  phase                 public.cycle_phase,
  intensity_coefficient numeric,
  volume_coefficient    numeric,
  day_of_cycle          int,
  cycle_length_days     int
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
         public.load_volume_coefficient(ph.p),
         ph.d,
         ph.len
  from (
    select public.cycle_phase_on(cl.period_start_date, cl.cycle_length_days, p_on) as p,
           public.cycle_day(cl.period_start_date, cl.cycle_length_days, p_on)      as d,
           cl.cycle_length_days                                                    as len
    from public.cycle_logs cl
    where cl.client_id = p_client
      and cl.period_start_date <= p_on
    order by cl.period_start_date desc
    limit 1
  ) ph
  where ph.p is not null;
end;
$$;

revoke all     on function public.client_cycle_state(uuid, date) from anon, public;
grant  execute on function public.client_cycle_state(uuid, date) to authenticated;

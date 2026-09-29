-- client_cycle_state, whole again.
--
-- 20260923180000 recreated this function to add day_of_cycle and
-- cycle_length_days, and rebuilt it from the older definition: the coach's
-- levers (load_pct, rpe_cap, sets_delta, kcal_delta, carbs_g_delta,
-- configured) and manual mode, both added by 20260922142527, silently went.
-- This puts every column back, in the order both versions had them, with the
-- two new ones last.
--
-- One default changes to match what the coach is shown: unconfigured luteal
-- trims volume (0.90), which her Cycle tab states as "−1 set". sets_delta now
-- says the same, so the client applies what the coach reads.

drop function if exists public.client_cycle_state(uuid, date);

create function public.client_cycle_state(
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
  configured            boolean,
  day_of_cycle          int,
  cycle_length_days     int
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
  v_day      int;
  v_len      int;
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
    -- The coach names the phase; there is no date to count a day from.
    v_phase := v_manual;
  else
    select public.cycle_phase_on(cl.period_start_date, cl.cycle_length_days, p_on),
           public.cycle_day(cl.period_start_date, cl.cycle_length_days, p_on),
           cl.cycle_length_days
      into v_phase, v_day, v_len
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
    return query select
      v_phase,
      1 + (v_adj.load_pct::numeric / 100),
      1::numeric,
      v_adj.load_pct,
      v_adj.rpe_cap,
      v_adj.sets_delta,
      v_adj.kcal_delta,
      v_adj.carbs_g_delta,
      true,
      v_day,
      v_len;
  else
    return query select
      v_phase,
      public.load_intensity_coefficient(v_phase),
      public.load_volume_coefficient(v_phase),
      round((public.load_intensity_coefficient(v_phase) - 1) * 100)::int,
      null::numeric,
      case when public.load_volume_coefficient(v_phase) < 1 then -1 else 0 end,
      0,
      0,
      false,
      v_day,
      v_len;
  end if;
end;
$$;

revoke all     on function public.client_cycle_state(uuid, date) from anon, public;
grant  execute on function public.client_cycle_state(uuid, date) to authenticated;

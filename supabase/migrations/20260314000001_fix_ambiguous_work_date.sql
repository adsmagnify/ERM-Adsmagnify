-- Fix: work_date was both a variable and a column, so clock-out failed.
-- Safe to re-run in the SQL editor.

create or replace function private.evaluate_attendance(
  p_user_id uuid,
  p_clock_in timestamptz,
  p_clock_out timestamptz
)
returns table (status text, status_reason text)
language plpgsql
stable
set search_path = ''
as $$
declare
  in_local timestamp;
  out_local timestamp;
  v_work_date date;
  in_by time;
  out_after time;
  late boolean;
  left_early boolean;
  delay_covers boolean;
begin
  if p_clock_in is null or p_clock_out is null then
    status := null;
    status_reason := null;
    return next;
    return;
  end if;

  in_local := p_clock_in at time zone 'Asia/Kolkata';
  out_local := p_clock_out at time zone 'Asia/Kolkata';
  v_work_date := in_local::date;

  select
    case
      when extract(dow from in_local) = 3
           and p.wednesday_clock_in_by is not null
        then p.wednesday_clock_in_by
      else coalesce(p.clock_in_by, time '10:45:00')
    end,
    coalesce(p.clock_out_after, time '19:00:00')
  into in_by, out_after
  from public.profiles p
  where p.id = p_user_id;

  if in_by is null then
    in_by := time '10:45:00';
  end if;
  if out_after is null then
    out_after := time '19:00:00';
  end if;

  late := in_local::time > in_by;
  left_early := out_local < (v_work_date::timestamp + out_after);

  if late then
    select exists (
      select 1
      from public.delay_notices d
      where d.user_id = p_user_id
        and d.work_date = v_work_date
        and p_clock_in <= d.eta
    )
    into delay_covers;

    if delay_covers then
      late := false;
    end if;
  end if;

  if late then
    status := 'Half day';
    status_reason := 'Late arrival';
  elsif left_early then
    status := 'Half day';
    status_reason := 'Left early';
  else
    status := 'Full day';
    status_reason := null;
  end if;

  return next;
end;
$$;

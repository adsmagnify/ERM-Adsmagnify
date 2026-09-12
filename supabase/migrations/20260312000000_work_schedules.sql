-- Per-person work hours. Default remains 10:45 AM – 7:00 PM IST.
-- Sneha: 3:30 PM – 7:00 PM, Wednesdays 4:30 PM – 7:00 PM.
-- Aditya: 2:00 PM – 6:00 PM.
-- Safe to re-run in the SQL editor.
-- If you re-run this after office presence is enabled, also re-run
-- 20260313000000_office_presence.sql so clock in stays locked to the office.

alter table public.profiles
  add column if not exists clock_in_by time not null default time '10:45:00',
  add column if not exists clock_out_after time not null default time '19:00:00',
  add column if not exists wednesday_clock_in_by time;

drop function if exists private.evaluate_attendance(timestamptz, timestamptz);

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
  work_date date;
  in_by time;
  out_after time;
  late boolean;
  left_early boolean;
begin
  if p_clock_in is null or p_clock_out is null then
    status := null;
    status_reason := null;
    return next;
    return;
  end if;

  in_local := p_clock_in at time zone 'Asia/Kolkata';
  out_local := p_clock_out at time zone 'Asia/Kolkata';
  work_date := in_local::date;

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
  left_early := out_local < (work_date::timestamp + out_after);

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

create or replace function private.attendance_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  eval_status text;
  eval_reason text;
begin
  if tg_op = 'INSERT' then
    if auth.uid() is not null then
      new.user_id := auth.uid();
    end if;

    new.clock_in := now();
    new.clock_out := null;
    new.status := null;
    new.status_reason := null;
    new.work_date := (timezone('Asia/Kolkata', new.clock_in))::date;
    new.created_at := now();
    return new;
  end if;

  if tg_op = 'UPDATE' then
    new.id := old.id;
    new.user_id := old.user_id;
    new.work_date := old.work_date;
    new.created_at := old.created_at;
    new.clock_in := old.clock_in;

    if old.clock_out is not null then
      new.clock_out := old.clock_out;
    elsif new.clock_out is not null then
      new.clock_out := now();
    end if;

    if new.clock_out is not null then
      select e.status, e.status_reason
        into eval_status, eval_reason
      from private.evaluate_attendance(new.user_id, new.clock_in, new.clock_out) e;

      new.status := eval_status;
      new.status_reason := eval_reason;
    else
      new.status := null;
      new.status_reason := null;
    end if;

    return new;
  end if;

  return new;
end;
$$;

create or replace function private.protect_profile_schedule()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE'
     and (
       new.clock_in_by is distinct from old.clock_in_by
       or new.clock_out_after is distinct from old.clock_out_after
       or new.wednesday_clock_in_by is distinct from old.wednesday_clock_in_by
     ) then
    if auth.uid() is null then
      return new;
    end if;

    if not private.is_admin() then
      raise exception 'Only an admin can change schedules';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists protect_profile_schedule on public.profiles;
create trigger protect_profile_schedule
  before update on public.profiles
  for each row execute function private.protect_profile_schedule();

update public.profiles
set
  clock_in_by = time '15:30:00',
  clock_out_after = time '19:00:00',
  wednesday_clock_in_by = time '16:30:00'
where full_name ilike '%sneha%'
   or split_part(coalesce(email, ''), '@', 1) ilike '%sneha%';

update public.profiles
set
  clock_in_by = time '14:00:00',
  clock_out_after = time '18:00:00',
  wednesday_clock_in_by = null
where full_name ilike '%aditya%'
   or split_part(coalesce(email, ''), '@', 1) ilike '%aditya%';

update public.attendance
set status = status
where clock_in is not null
  and clock_out is not null;

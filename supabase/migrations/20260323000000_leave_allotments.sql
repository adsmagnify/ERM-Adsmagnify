-- Per-person leave allotments (CL / SL / Comp Off) and Comp Off leave kind.
-- Safe to re-run in the SQL editor.

do $$ begin
  alter type public.leave_kind add value if not exists 'Comp Off';
exception
  when duplicate_object then null;
end $$;

alter table public.profiles
  add column if not exists casual_total integer not null default 0,
  add column if not exists sick_total integer not null default 0,
  add column if not exists comp_off_total integer not null default 0;

alter table public.profiles
  drop constraint if exists profiles_casual_total_check,
  drop constraint if exists profiles_sick_total_check,
  drop constraint if exists profiles_comp_off_total_check;

alter table public.profiles
  add constraint profiles_casual_total_check check (casual_total >= 0),
  add constraint profiles_sick_total_check check (sick_total >= 0),
  add constraint profiles_comp_off_total_check check (comp_off_total >= 0);

alter table public.attendance drop constraint if exists attendance_reason_check;
alter table public.attendance
  add constraint attendance_reason_check
  check (
    status_reason is null
    or status_reason in ('Late arrival', 'Left early', 'Casual', 'Sick', 'Comp Off')
  );

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
    if new.status = 'Leave' and new.clock_in is null then
      new.clock_out := null;
      new.status := 'Leave';
      if new.status_reason not in ('Casual', 'Sick', 'Comp Off') then
        new.status_reason := null;
      end if;
      new.status_overridden := true;
      new.auto_clocked_out := false;
      new.created_at := coalesce(new.created_at, now());
      new.clock_in_lat := null;
      new.clock_in_lng := null;
      new.clock_in_accuracy := null;
      new.clock_in_ip := null;
      new.clock_out_lat := null;
      new.clock_out_lng := null;
      new.clock_out_accuracy := null;
      new.clock_out_ip := null;
      return new;
    end if;

    if auth.uid() is not null then
      new.user_id := auth.uid();
    end if;

    new.clock_in := now();
    new.clock_out := null;
    new.status := null;
    new.status_reason := null;
    new.status_overridden := false;
    new.auto_clocked_out := false;
    new.work_date := (timezone('Asia/Kolkata', new.clock_in))::date;
    new.created_at := now();
    new.clock_out_lat := null;
    new.clock_out_lng := null;
    new.clock_out_accuracy := null;
    new.clock_out_ip := null;
    return new;
  end if;

  if tg_op = 'UPDATE' then
    new.id := old.id;
    new.user_id := old.user_id;
    new.work_date := old.work_date;
    new.created_at := old.created_at;

    if old.clock_in is null
       and (
         new.clock_in is not null
         or new.clock_in_lat is not null
         or new.clock_in_lng is not null
         or new.clock_in_ip is not null
       )
    then
      new.clock_in := now();
      new.clock_out := null;
      new.status := null;
      new.status_reason := null;
      new.status_overridden := false;
      new.auto_clocked_out := false;
      new.clock_out_lat := null;
      new.clock_out_lng := null;
      new.clock_out_accuracy := null;
      new.clock_out_ip := null;
      return new;
    end if;

    if old.clock_in is null then
      new.clock_in := null;
      new.clock_out := null;
      new.status := 'Leave';
      new.status_reason := coalesce(new.status_reason, old.status_reason);
      new.status_overridden := true;
      new.auto_clocked_out := false;
      new.clock_in_lat := old.clock_in_lat;
      new.clock_in_lng := old.clock_in_lng;
      new.clock_in_accuracy := old.clock_in_accuracy;
      new.clock_in_ip := old.clock_in_ip;
      new.clock_out_lat := null;
      new.clock_out_lng := null;
      new.clock_out_accuracy := null;
      new.clock_out_ip := null;
      return new;
    end if;

    new.clock_in := old.clock_in;
    new.clock_in_lat := old.clock_in_lat;
    new.clock_in_lng := old.clock_in_lng;
    new.clock_in_accuracy := old.clock_in_accuracy;
    new.clock_in_ip := old.clock_in_ip;

    if old.clock_out is not null then
      new.clock_out := old.clock_out;
      new.clock_out_lat := old.clock_out_lat;
      new.clock_out_lng := old.clock_out_lng;
      new.clock_out_accuracy := old.clock_out_accuracy;
      new.clock_out_ip := old.clock_out_ip;
      new.auto_clocked_out := old.auto_clocked_out;
    elsif new.clock_out is not null then
      if coalesce(new.auto_clocked_out, false) then
        if timezone('Asia/Kolkata', old.clock_in) <
          (old.work_date + time '21:00:00')
        then
          new.clock_out :=
            ((old.work_date + time '21:00:00') at time zone 'Asia/Kolkata');
        else
          new.clock_out :=
            ((old.work_date + 1) at time zone 'Asia/Kolkata');
        end if;
        new.auto_clocked_out := true;
      else
        new.clock_out := now();
        new.auto_clocked_out := false;
      end if;
    end if;

    if new.clock_out is null then
      new.status := null;
      new.status_reason := null;
      new.status_overridden := false;
    elsif old.clock_out is not null
      and coalesce(new.status_overridden, false)
      and new.status in ('Full day', 'Half day')
    then
      if new.status = 'Full day' then
        new.status_reason := null;
      else
        new.status_reason := old.status_reason;
      end if;
      new.status_overridden := true;
    else
      select e.status, e.status_reason
        into eval_status, eval_reason
      from private.evaluate_attendance(new.user_id, new.clock_in, new.clock_out) e;

      new.status := eval_status;
      new.status_reason := eval_reason;
      new.status_overridden := false;
    end if;

    return new;
  end if;

  return new;
end;
$$;

-- Remaining from HR sheet + already-approved days in the app = Total.
-- Sneha: CL remaining 1 + 1 approved Casual = total 2.
update public.profiles set casual_total = 7, sick_total = 10, comp_off_total = 0
where full_name ilike '%bhagat%' or email ilike '%bagavath%';

update public.profiles set casual_total = 2, sick_total = 2, comp_off_total = 0
where full_name ilike '%sneha%' or email ilike '%sneha%';

update public.profiles set casual_total = 5, sick_total = 6, comp_off_total = 0
where full_name ilike '%kajal%' or email ilike '%kajal%';

update public.profiles set casual_total = 0, sick_total = 0, comp_off_total = 0
where full_name ilike '%pooja%' or email ilike '%pooja%';

update public.profiles set casual_total = 2, sick_total = 3, comp_off_total = 0
where full_name ilike '%aditya%' or email ilike '%aditya%';

notify pgrst, 'reload schema';

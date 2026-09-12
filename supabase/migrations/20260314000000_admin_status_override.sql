-- Admins can set Full day / Half day after clock-out.
-- Safe to re-run in the SQL editor.

alter table public.attendance
  add column if not exists status_overridden boolean not null default false;

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
    new.status_overridden := false;
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
    elsif new.clock_out is not null then
      new.clock_out := now();
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

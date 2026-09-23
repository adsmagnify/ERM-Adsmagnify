-- When leave is approved, store a Leave attendance row for each working day.
-- Safe to re-run in the SQL editor.

alter table public.attendance drop constraint if exists attendance_status_check;
alter table public.attendance
  add constraint attendance_status_check
  check (status is null or status in ('Full day', 'Half day', 'Leave'));

alter table public.attendance drop constraint if exists attendance_reason_check;
alter table public.attendance
  add constraint attendance_reason_check
  check (
    status_reason is null
    or status_reason in ('Late arrival', 'Left early', 'Casual', 'Sick')
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
      if new.status_reason not in ('Casual', 'Sick') then
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

create or replace function private.sync_leave_attendance()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  d date;
  v_dow integer;
begin
  if tg_op = 'UPDATE' then
    delete from public.attendance a
    where a.user_id = old.user_id
      and a.work_date between old.from_date and old.to_date
      and a.clock_in is null
      and a.status = 'Leave';
  end if;

  if new.status is distinct from 'Approved' then
    return new;
  end if;

  for d in
    select gs::date
    from pg_catalog.generate_series(new.from_date, new.to_date, interval '1 day') gs
  loop
    v_dow := extract(dow from d)::int;
    if v_dow = 0
       or (
         v_dow = 6
         and ((extract(day from d)::int - 1) / 7) + 1 in (1, 3, 5)
       )
    then
      continue;
    end if;

    insert into public.attendance (
      user_id,
      work_date,
      status,
      status_reason,
      status_overridden
    )
    values (
      new.user_id,
      d,
      'Leave',
      new.kind::text,
      true
    )
    on conflict (user_id, work_date) do update
      set
        status = 'Leave',
        status_reason = excluded.status_reason,
        status_overridden = true
      where public.attendance.clock_in is null;
  end loop;

  return new;
end;
$$;

drop trigger if exists leave_requests_sync_attendance on public.leave_requests;
create trigger leave_requests_sync_attendance
  after insert or update of status, from_date, to_date, kind
  on public.leave_requests
  for each row
  execute function private.sync_leave_attendance();

update public.leave_requests
set status = status
where status = 'Approved';

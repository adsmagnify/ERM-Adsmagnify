-- Auto clock-out at 9:00 PM IST if the person is still in.
-- Safe to re-run in the SQL editor.

alter table public.attendance
  add column if not exists auto_clocked_out boolean not null default false;

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

create or replace function public.close_open_attendance()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  closed integer := 0;
  ist_now timestamp := timezone('Asia/Kolkata', now());
  today date := ist_now::date;
  cutoff time := time '21:00:00';
begin
  update public.attendance a
  set
    clock_out = case
      when timezone('Asia/Kolkata', a.clock_in) < (a.work_date + cutoff)
        then ((a.work_date + cutoff) at time zone 'Asia/Kolkata')
      else ((a.work_date + 1) at time zone 'Asia/Kolkata')
    end,
    auto_clocked_out = true
  where a.clock_in is not null
    and a.clock_out is null
    and (
      a.work_date < today
      or (
        a.work_date = today
        and ist_now::time >= cutoff
        and timezone('Asia/Kolkata', a.clock_in) < (a.work_date + cutoff)
      )
    );

  get diagnostics closed = row_count;
  return closed;
end;
$$;

revoke all on function public.close_open_attendance() from public, anon, authenticated;
grant execute on function public.close_open_attendance() to service_role;

notify pgrst, 'reload schema';

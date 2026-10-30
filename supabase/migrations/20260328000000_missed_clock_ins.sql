-- Admin can record a working day with no punch (forgot to clock in).
-- Aditya: missed punches, not leave.
-- Manav: 19 and 24 Oct missed punches; 16 Oct NYSA shoot is a full day.
-- Safe to re-run in the SQL editor.

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

    if new.clock_in is null
       and coalesce(new.status_overridden, false)
       and new.status in ('Full day', 'Half day')
    then
      new.clock_out := null;
      new.status_reason := null;
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
      new.auto_clocked_out := false;
      new.status_overridden := true;
      new.clock_in_lat := old.clock_in_lat;
      new.clock_in_lng := old.clock_in_lng;
      new.clock_in_accuracy := old.clock_in_accuracy;
      new.clock_in_ip := old.clock_in_ip;
      new.clock_out_lat := null;
      new.clock_out_lng := null;
      new.clock_out_accuracy := null;
      new.clock_out_ip := null;
      if coalesce(new.status, old.status) = 'Leave' then
        new.status := 'Leave';
        new.status_reason := coalesce(new.status_reason, old.status_reason);
      else
        new.status := case
          when coalesce(new.status, old.status) = 'Half day' then 'Half day'
          else 'Full day'
        end;
        new.status_reason := null;
      end if;
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

insert into public.attendance (
  user_id,
  work_date,
  status,
  status_overridden
)
select p.id, d::date, 'Full day', true
from public.profiles p
cross join (values
  (date '2026-10-01'),
  (date '2026-10-05'),
  (date '2026-10-16'),
  (date '2026-10-26')
) as days(d)
where p.full_name ilike '%aditya%'
on conflict (user_id, work_date) do nothing;

insert into public.attendance (
  user_id,
  work_date,
  status,
  status_overridden
)
select p.id, d::date, 'Full day', true
from public.profiles p
cross join (values
  (date '2026-10-19'),
  (date '2026-10-24')
) as days(d)
where p.full_name ilike '%manav%'
on conflict (user_id, work_date) do nothing;

update public.attendance a
set
  status = 'Full day',
  status_overridden = true
from public.profiles p
where a.user_id = p.id
  and p.full_name ilike '%manav%'
  and a.work_date = date '2026-10-16'
  and a.clock_out is not null;

notify pgrst, 'reload schema';

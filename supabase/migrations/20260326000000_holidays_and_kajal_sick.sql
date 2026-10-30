-- Company holidays (do not count as absent).
-- 2 Oct 2026 Gandhi Jayanti, 20 Oct 2026 company holiday.
-- Kajal: approved sick leave on 22 Oct 2026.
-- Safe to re-run in the SQL editor.

create table if not exists public.holidays (
  work_date date primary key,
  name text not null default 'Holiday'
);

alter table public.holidays enable row level security;

grant select on table public.holidays to authenticated;
revoke all on table public.holidays from anon;
revoke insert, update, delete on table public.holidays from authenticated;

drop policy if exists holidays_select on public.holidays;
create policy holidays_select
  on public.holidays for select to authenticated
  using (true);

insert into public.holidays (work_date, name) values
  (date '2026-10-02', 'Gandhi Jayanti'),
  (date '2026-10-20', 'Holiday')
on conflict (work_date) do update set name = excluded.name;

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
       or exists (select 1 from public.holidays h where h.work_date = d)
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

insert into public.leave_requests (
  user_id,
  kind,
  from_date,
  to_date,
  reason,
  status
)
select
  p.id,
  'Sick',
  date '2026-10-22',
  date '2026-10-22',
  'Sick leave',
  'Approved'
from public.profiles p
where p.full_name ilike '%kajal%'
  and not exists (
    select 1
    from public.leave_requests l
    where l.user_id = p.id
      and l.from_date <= date '2026-10-22'
      and l.to_date >= date '2026-10-22'
      and l.status <> 'Rejected'
  );

notify pgrst, 'reload schema';

-- Adsmagnify Clock & Tasks
-- Timezone: store timestamptz (UTC), evaluate rules in Asia/Kolkata.

create extension if not exists "pgcrypto";

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------

create type public.task_priority as enum ('High', 'Medium', 'Low');
create type public.task_status as enum ('To Do', 'In Progress', 'Done');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  email text,
  clock_in_by time not null default time '10:45:00',
  clock_out_after time not null default time '19:00:00',
  wednesday_clock_in_by time,
  created_at timestamptz not null default now()
);

create table public.attendance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  work_date date not null,
  clock_in timestamptz,
  clock_out timestamptz,
  status text,
  status_reason text,
  created_at timestamptz not null default now(),
  unique (user_id, work_date),
  constraint attendance_status_check
    check (status is null or status in ('Full day', 'Half day')),
  constraint attendance_reason_check
    check (status_reason is null or status_reason in ('Late arrival', 'Left early')),
  constraint attendance_out_after_in_check
    check (clock_out is null or clock_in is null or clock_out >= clock_in)
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(trim(title)) > 0),
  priority public.task_priority not null default 'Medium',
  status public.task_status not null default 'To Do',
  due_date date,
  created_at timestamptz not null default now()
);

create table public.delay_notices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  work_date date not null,
  eta timestamptz not null,
  reason text not null check (char_length(trim(reason)) > 0),
  message text not null check (char_length(trim(message)) > 0),
  created_at timestamptz not null default now(),
  unique (user_id, work_date)
);

create index attendance_user_id_work_date_idx
  on public.attendance (user_id, work_date desc);

create index tasks_user_id_status_idx
  on public.tasks (user_id, status);

create index tasks_user_id_due_date_idx
  on public.tasks (user_id, due_date);

create index delay_notices_work_date_idx
  on public.delay_notices (work_date);

-- ---------------------------------------------------------------------------
-- Profile trigger (signup)
-- ---------------------------------------------------------------------------

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      split_part(coalesce(new.email, ''), '@', 1)
    ),
    new.email
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- ---------------------------------------------------------------------------
-- Attendance status (server-side, IST rules)
-- Default: clock in after 10:45 AM IST = Half day (Late arrival).
-- On time but clock out before 7:00 PM IST = Half day (Left early).
-- On time and clock out at or after 7:00 PM IST = Full day.
-- Per-person times live on profiles (clock_in_by, clock_out_after, wednesday_clock_in_by).

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
    select exists (
      select 1
      from public.delay_notices d
      where d.user_id = p_user_id
        and d.work_date = work_date
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

create trigger attendance_guard_biu
  before insert or update on public.attendance
  for each row execute function private.attendance_guard();

-- ---------------------------------------------------------------------------
-- Clock RPCs — the only intended way to write attendance times
-- ---------------------------------------------------------------------------

create or replace function public.clock_in()
returns public.attendance
language plpgsql
security invoker
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  rec public.attendance;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.attendance (user_id, work_date, clock_in)
  values (
    uid,
    (timezone('Asia/Kolkata', now()))::date,
    now()
  )
  returning * into rec;

  return rec;
exception
  when unique_violation then
    raise exception 'Already clocked in today';
end;
$$;

create or replace function public.clock_out()
returns public.attendance
language plpgsql
security invoker
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  rec public.attendance;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  update public.attendance
     set clock_out = now()
   where id = (
     select a.id
     from public.attendance a
     where a.user_id = uid
       and a.clock_in is not null
       and a.clock_out is null
     order by a.work_date desc
     limit 1
   )
  returning * into rec;

  if rec.id is null then
    if exists (
      select 1
      from public.attendance a
      where a.user_id = uid
        and a.work_date = (timezone('Asia/Kolkata', now()))::date
        and a.clock_out is not null
    ) then
      raise exception 'Already clocked out today';
    end if;

    raise exception 'Clock in first';
  end if;

  return rec;
end;
$$;

grant execute on function public.clock_in() to authenticated;
grant execute on function public.clock_out() to authenticated;
revoke execute on function public.clock_in() from anon, public;
revoke execute on function public.clock_out() from anon, public;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.attendance enable row level security;
alter table public.tasks enable row level security;
alter table public.delay_notices enable row level security;

create policy profiles_select_own
  on public.profiles for select to authenticated
  using (id = (select auth.uid()));

create policy profiles_update_own
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy attendance_select_own
  on public.attendance for select to authenticated
  using (user_id = (select auth.uid()));

create policy attendance_insert_own
  on public.attendance for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy attendance_update_own
  on public.attendance for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy tasks_select_own
  on public.tasks for select to authenticated
  using (user_id = (select auth.uid()));

create policy tasks_insert_own
  on public.tasks for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy tasks_update_own
  on public.tasks for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy tasks_delete_own
  on public.tasks for delete to authenticated
  using (user_id = (select auth.uid()));

create policy delay_notices_select_own
  on public.delay_notices for select to authenticated
  using (user_id = (select auth.uid()));

create policy delay_notices_insert_own
  on public.delay_notices for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy delay_notices_update_own
  on public.delay_notices for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

grant select, update on table public.profiles to authenticated;
grant select, insert, update on table public.attendance to authenticated;
grant select, insert, update, delete on table public.tasks to authenticated;
grant select, insert, update on table public.delay_notices to authenticated;

revoke all on table public.profiles from anon;
revoke all on table public.attendance from anon;
revoke all on table public.tasks from anon;
revoke all on table public.delay_notices from anon;

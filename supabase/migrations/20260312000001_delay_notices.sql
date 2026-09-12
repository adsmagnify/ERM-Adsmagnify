-- Delay notices: send a late email, then clock in by ETA for a full day.
-- Safe to re-run in the SQL editor.

create table if not exists public.delay_notices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  work_date date not null,
  eta timestamptz not null,
  reason text not null check (char_length(trim(reason)) > 0),
  message text not null check (char_length(trim(message)) > 0),
  created_at timestamptz not null default now(),
  unique (user_id, work_date)
);

create index if not exists delay_notices_work_date_idx
  on public.delay_notices (work_date);

alter table public.delay_notices enable row level security;

grant select, insert, update on table public.delay_notices to authenticated;
revoke all on table public.delay_notices from anon;

drop policy if exists delay_notices_select on public.delay_notices;
drop policy if exists delay_notices_insert on public.delay_notices;
drop policy if exists delay_notices_update on public.delay_notices;
drop policy if exists delay_notices_select_own on public.delay_notices;
drop policy if exists delay_notices_insert_own on public.delay_notices;
drop policy if exists delay_notices_update_own on public.delay_notices;

create policy delay_notices_select
  on public.delay_notices for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_admin()));

create policy delay_notices_insert
  on public.delay_notices for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy delay_notices_update
  on public.delay_notices for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

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

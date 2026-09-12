-- Clock in / out only from the Churchgate office (IP + GPS).
-- Safe to re-run in the SQL editor.
--
-- After this runs, an admin must open People on office ethernet or Wi-Fi
-- and save the office network. Save once from each if they use different
-- internet lines. Until then, clock in is blocked.

create table if not exists public.office_settings (
  id int primary key default 1 check (id = 1),
  label text not null,
  address text not null,
  lat double precision not null,
  lng double precision not null,
  radius_m int not null check (radius_m between 50 and 2000),
  allowed_ips inet[] not null default '{}',
  updated_at timestamptz not null default now()
);

alter table public.office_settings enable row level security;

grant select on table public.office_settings to authenticated;
grant update on table public.office_settings to authenticated;
revoke all on table public.office_settings from anon;

drop policy if exists office_settings_select on public.office_settings;
drop policy if exists office_settings_update on public.office_settings;

create policy office_settings_select
  on public.office_settings for select to authenticated
  using (true);

create policy office_settings_update
  on public.office_settings for update to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

insert into public.office_settings (
  id, label, address, lat, lng, radius_m, allowed_ips
)
values (
  1,
  'Churchgate office',
  'G12, Pil Court, Near GST Bhavan, New Marine Lines, Churchgate, Mumbai 400020',
  18.9361794,
  72.8276668,
  350,
  '{}'
)
on conflict (id) do update
set
  label = excluded.label,
  address = excluded.address,
  lat = excluded.lat,
  lng = excluded.lng,
  radius_m = excluded.radius_m,
  updated_at = now();

alter table public.attendance
  add column if not exists clock_in_lat double precision,
  add column if not exists clock_in_lng double precision,
  add column if not exists clock_in_accuracy double precision,
  add column if not exists clock_in_ip inet,
  add column if not exists clock_out_lat double precision,
  add column if not exists clock_out_lng double precision,
  add column if not exists clock_out_accuracy double precision,
  add column if not exists clock_out_ip inet;

-- Employees must not write attendance from the browser. Clock goes
-- through the Next.js server after IP + location checks.
drop policy if exists attendance_insert on public.attendance;
drop policy if exists attendance_update on public.attendance;
drop policy if exists attendance_insert_own on public.attendance;
drop policy if exists attendance_update_own on public.attendance;

revoke insert, update, delete on table public.attendance from authenticated;
grant select on table public.attendance to authenticated;

revoke execute on function public.clock_in() from authenticated, anon, public;
revoke execute on function public.clock_out() from authenticated, anon, public;

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

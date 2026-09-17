-- Casual / sick leave requests. Safe to re-run in the SQL editor.

do $$ begin
  create type public.leave_kind as enum ('Casual', 'Sick');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.leave_status as enum ('Pending', 'Approved', 'Rejected');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.leave_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind public.leave_kind not null,
  from_date date not null,
  to_date date not null,
  reason text not null check (char_length(trim(reason)) > 0),
  status public.leave_status not null default 'Pending',
  created_at timestamptz not null default now(),
  check (to_date >= from_date)
);

create index if not exists leave_requests_user_id_idx
  on public.leave_requests (user_id);

create index if not exists leave_requests_from_date_idx
  on public.leave_requests (from_date);

create index if not exists leave_requests_status_idx
  on public.leave_requests (status);

alter table public.leave_requests enable row level security;

grant select, insert on table public.leave_requests to authenticated;
revoke all on table public.leave_requests from anon;
revoke update, delete on table public.leave_requests from authenticated;

drop policy if exists leave_requests_select on public.leave_requests;
drop policy if exists leave_requests_insert on public.leave_requests;

create policy leave_requests_select
  on public.leave_requests for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_admin()));

create policy leave_requests_insert
  on public.leave_requests for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and status = 'Pending'
  );

notify pgrst, 'reload schema';

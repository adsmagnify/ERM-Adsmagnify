-- Roles: admin sees all rows; employee sees only their own.
-- Safe to re-run in the SQL editor.

do $$ begin
  create type public.user_role as enum ('admin', 'employee');
exception
  when duplicate_object then null;
end $$;

alter table public.profiles
  add column if not exists role public.user_role not null default 'employee';

create index if not exists profiles_role_idx on public.profiles (role);

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
  );
$$;

grant execute on function private.is_admin() to authenticated;
grant usage on schema private to authenticated;

-- Allow SQL editor / migrations (no JWT) and first-admin bootstrap.
create or replace function private.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.role is distinct from old.role then
    if auth.uid() is null then
      return new;
    end if;

    if not exists (
      select 1 from public.profiles where role = 'admin'
    ) then
      return new;
    end if;

    if not private.is_admin() then
      raise exception 'Only an admin can change roles';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists protect_profile_role on public.profiles;
create trigger protect_profile_role
  before update on public.profiles
  for each row execute function private.protect_profile_role();

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  assigned_role public.user_role := 'employee';
begin
  if not exists (select 1 from public.profiles) then
    assigned_role := 'admin';
  end if;

  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      split_part(coalesce(new.email, ''), '@', 1)
    ),
    new.email,
    assigned_role
  );
  return new;
end;
$$;

update public.profiles
set role = 'admin'
where id = (
  select id from public.profiles order by created_at asc limit 1
)
and not exists (
  select 1 from public.profiles where role = 'admin'
);

drop policy if exists profiles_select_own on public.profiles;
drop policy if exists profiles_update_own on public.profiles;
drop policy if exists attendance_select_own on public.attendance;
drop policy if exists attendance_insert_own on public.attendance;
drop policy if exists attendance_update_own on public.attendance;
drop policy if exists tasks_select_own on public.tasks;
drop policy if exists tasks_insert_own on public.tasks;
drop policy if exists tasks_update_own on public.tasks;
drop policy if exists tasks_delete_own on public.tasks;

drop policy if exists profiles_select on public.profiles;
drop policy if exists profiles_update on public.profiles;
drop policy if exists attendance_select on public.attendance;
drop policy if exists attendance_insert on public.attendance;
drop policy if exists attendance_update on public.attendance;
drop policy if exists tasks_select on public.tasks;
drop policy if exists tasks_insert on public.tasks;
drop policy if exists tasks_update on public.tasks;
drop policy if exists tasks_delete on public.tasks;

create policy profiles_select
  on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select private.is_admin()));

create policy profiles_update
  on public.profiles for update to authenticated
  using (id = (select auth.uid()) or (select private.is_admin()))
  with check (id = (select auth.uid()) or (select private.is_admin()));

create policy attendance_select
  on public.attendance for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_admin()));

create policy attendance_insert
  on public.attendance for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy attendance_update
  on public.attendance for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy tasks_select
  on public.tasks for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_admin()));

create policy tasks_insert
  on public.tasks for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy tasks_update
  on public.tasks for update to authenticated
  using (user_id = (select auth.uid()) or (select private.is_admin()))
  with check (user_id = (select auth.uid()) or (select private.is_admin()));

create policy tasks_delete
  on public.tasks for delete to authenticated
  using (user_id = (select auth.uid()) or (select private.is_admin()));

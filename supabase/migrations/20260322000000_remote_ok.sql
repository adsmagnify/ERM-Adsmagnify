-- Remote employees can clock in/out without office GPS or IP.
-- Safe to re-run in the SQL editor.

alter table public.profiles
  add column if not exists remote_ok boolean not null default false;

create or replace function private.protect_profile_remote()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE'
     and new.remote_ok is distinct from old.remote_ok then
    if auth.uid() is null then
      return new;
    end if;

    if not private.is_admin() then
      raise exception 'Only an admin can change remote clock access';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists protect_profile_remote on public.profiles;
create trigger protect_profile_remote
  before update on public.profiles
  for each row execute function private.protect_profile_remote();

notify pgrst, 'reload schema';

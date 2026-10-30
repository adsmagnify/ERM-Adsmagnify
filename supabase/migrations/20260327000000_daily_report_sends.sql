-- Record whether the daily team email went out for a work date.
-- Safe to re-run in the SQL editor.

create table if not exists public.daily_report_sends (
  work_date date primary key,
  sent_at timestamptz not null default now()
);

alter table public.daily_report_sends enable row level security;

grant select on table public.daily_report_sends to authenticated;
revoke all on table public.daily_report_sends from anon;
revoke insert, update, delete on table public.daily_report_sends from authenticated;

drop policy if exists daily_report_sends_select on public.daily_report_sends;
create policy daily_report_sends_select
  on public.daily_report_sends for select to authenticated
  using ((select private.is_admin()));

notify pgrst, 'reload schema';

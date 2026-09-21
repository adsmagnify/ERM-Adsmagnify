-- Static office IP. The current public address is stored here and
-- refreshed when someone clocks in at Churchgate after the ISP changes it.
-- Safe to re-run in the SQL editor.

alter table public.office_settings
  add column if not exists static_ip inet;

update public.office_settings
set static_ip = allowed_ips[1]
where id = 1
  and static_ip is null
  and cardinality(allowed_ips) > 0;

notify pgrst, 'reload schema';

-- Sumati works 11:00 AM – 4:00 PM IST.
-- Clock in by 10:45 AM (same 15-minute grace as the office 11 AM start).
-- Clock out at or after 4:00 PM for a full day.
-- Safe to re-run in the SQL editor.

update public.profiles
set
  clock_in_by = time '10:45:00',
  clock_out_after = time '16:00:00',
  wednesday_clock_in_by = null
where full_name ilike '%sumati%'
   or split_part(coalesce(email, ''), '@', 1) ilike '%sumati%';

-- Re-score closed days against the new hours. Leave rows and admin overrides stay put.
update public.attendance
set status = status
where user_id in (
  select id
  from public.profiles
  where full_name ilike '%sumati%'
     or split_part(coalesce(email, ''), '@', 1) ilike '%sumati%'
)
  and clock_in is not null
  and clock_out is not null;

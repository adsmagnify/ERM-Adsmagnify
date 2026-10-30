-- Sumati: clock in by 11:00 AM, clock out at or after 4:00 PM.
-- Safe to re-run in the SQL editor.

update public.profiles
set
  clock_in_by = time '11:00:00',
  clock_out_after = time '16:00:00',
  wednesday_clock_in_by = null
where full_name ilike '%sumati%'
   or split_part(coalesce(email, ''), '@', 1) ilike '%sumati%';

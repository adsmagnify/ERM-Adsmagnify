-- Sneha Wednesday clock-in is 4:45 PM IST.
-- Safe to re-run in the SQL editor.

update public.profiles
set wednesday_clock_in_by = time '16:45:00'
where full_name ilike '%sneha%'
   or split_part(coalesce(email, ''), '@', 1) ilike '%sneha%';

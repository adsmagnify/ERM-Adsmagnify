-- Sneha clocks in by 3:45 PM. Aditya clocks in by 2:15 PM.
-- Late after that is half day unless a delay notice covers the arrival.
-- Safe to re-run in the SQL editor.

update public.profiles
set clock_in_by = time '15:45:00'
where full_name ilike '%sneha%'
   or split_part(coalesce(email, ''), '@', 1) ilike '%sneha%';

update public.profiles
set clock_in_by = time '14:15:00'
where full_name ilike '%aditya%'
   or split_part(coalesce(email, ''), '@', 1) ilike '%aditya%';

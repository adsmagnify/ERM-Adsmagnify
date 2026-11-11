-- Kajal exceptions:
-- 28 Oct 2026: full day (discussed with admin).
-- 3 Nov 2026: late clock-in was a forgot-to-punch exception, not late arrival.
-- Safe to re-run in the SQL editor.

update public.attendance a
set
  status = 'Full day',
  status_reason = null,
  status_overridden = true
from public.profiles p
where a.user_id = p.id
  and p.full_name ilike '%kajal%'
  and a.work_date in (date '2026-10-28', date '2026-11-03')
  and a.clock_out is not null;

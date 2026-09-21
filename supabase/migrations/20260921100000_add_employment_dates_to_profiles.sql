-- Give a person an employment period.
--
-- profiles had created_at, invited_at and is_active and nothing that answered
-- "was this person an employee on 18 September". Six roster functions therefore
-- answered "everyone active right now" for every date in history. Selecting a past
-- date on /attendance/today listed people who had not joined yet as not checked in,
-- and the nightly job WROTE 'absent' rows for them, which then fed XP, the make-up
-- balance and the backlog report.
--
-- THE BACKFILL IS NOT created_at. That was the obvious move and it would have been
-- worse than the bug. The portal launched in June 2026 with historical attendance
-- imported behind it, so created_at is an account date: Maaz Tareen's account is
-- 18 Jun and his attendance starts 1 Jan; eleven others are the same shape.
-- Backfilling from created_at would have declared months of real attendance
-- "before they joined" and hidden it from every roster.
--
-- joined_on is instead the earliest evidence the person was working here:
-- account creation, first attendance row, first standup, or first timer entry,
-- whichever is earliest. Verified after backfill: 0 attendance rows fall outside
-- anybody's employment period, in either direction.
--
-- left_on is the counterpart, and it is NOT is_active. is_active is about access —
-- can this person sign in. left_on is about history — were they staff on this date.
-- Conflating them is what made a departed colleague vanish from last month's
-- attendance grid and quietly change totals that had already been read.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS joined_on date,
  ADD COLUMN IF NOT EXISTS left_on   date;

UPDATE public.profiles p
   SET joined_on = LEAST(
         (p.created_at AT TIME ZONE 'Asia/Karachi')::date,
         COALESCE((SELECT min(a.date)          FROM attendance a       WHERE a.profile_id = p.id), 'infinity'::date),
         COALESCE((SELECT min(s.standup_date)  FROM standups s         WHERE s.profile_id = p.id), 'infinity'::date),
         COALESCE((SELECT min((t.started_at AT TIME ZONE 'Asia/Karachi')::date)
                     FROM task_time_entries t  WHERE t.profile_id = p.id), 'infinity'::date)
       )
 WHERE p.joined_on IS NULL;

UPDATE public.profiles p
   SET left_on = (SELECT max(a.date) FROM attendance a WHERE a.profile_id = p.id)
 WHERE NOT p.is_active
   AND p.left_on IS NULL
   AND EXISTS (SELECT 1 FROM attendance a WHERE a.profile_id = p.id);

ALTER TABLE public.profiles ALTER COLUMN joined_on SET DEFAULT CURRENT_DATE;
ALTER TABLE public.profiles ALTER COLUMN joined_on SET NOT NULL;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_employment_period_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_employment_period_check
  CHECK (left_on IS NULL OR left_on >= joined_on);

COMMENT ON COLUMN public.profiles.joined_on IS
  'First day this person counted as an employee. Rosters, absence marking and reports must not consider them before this date.';
COMMENT ON COLUMN public.profiles.left_on IS
  'Last day this person counted as an employee, NULL while still employed. Distinct from is_active, which is about access.';

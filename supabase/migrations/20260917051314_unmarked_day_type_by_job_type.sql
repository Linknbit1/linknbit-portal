-- What a day with no check-in means, answered per job type.
--
-- fn_mark_absent_for_date() has always drawn one conclusion from silence: nobody
-- marked this person in on a working day, therefore they were absent. That holds
-- for on-site staff, whose presence the office terminal records. It is a guess
-- for hybrid and remote people, whose presence the office never sees: an
-- ordinary working day at home produces no punch at all, so every one of them
-- reads as an unexcused absence unless a WFH request was filed in advance.
--
-- The fix is not to stop writing a row. A missing row is the same silence one
-- layer down, and the reports synthesise an absence from it anyway. The fix is
-- to write the row that this person's job type says silence means.
--
-- It lives on job_type_policies because that table already holds every other
-- "for this job type, here is the attendance rule" answer — the office-network
-- gate, the terminal requirement, the schedule window. A second per-person
-- switch would immediately raise the question of which one out-ranks the other.
--
-- 'wfh' writes day_type = 'wfh' with status NULL: a home day whose attendance
-- fact is genuinely unknown, not a claim that they were present. Whether they
-- worked is answered where it is actually recorded — the standup and the timer.
-- The day stays a working day, so required minutes and the standup are unchanged.
--
-- Purely additive: the column defaults to 'absent', which is today's behaviour
-- for everybody, and only hybrid and remote are moved off it.

ALTER TABLE job_type_policies
  ADD COLUMN IF NOT EXISTS unmarked_day_type text NOT NULL DEFAULT 'absent';

ALTER TABLE job_type_policies DROP CONSTRAINT IF EXISTS job_type_policies_unmarked_day_type_check;
ALTER TABLE job_type_policies ADD CONSTRAINT job_type_policies_unmarked_day_type_check
  CHECK (unmarked_day_type IN ('absent', 'wfh'));

COMMENT ON COLUMN job_type_policies.unmarked_day_type IS
  'What the nightly absence job writes for this job type on a working day with no attendance row: absent = an unexcused absence; wfh = a home day carrying no attendance fact.';

UPDATE job_type_policies
   SET unmarked_day_type = 'wfh', updated_at = now()
 WHERE job_type IN ('hybrid', 'remote');

-- ── The per-person answer ────────────────────────────────────────────────────
-- Defaults to 'absent' for a profile with no job type and for a job type with no
-- policy row, so an incomplete profile keeps the stricter reading rather than
-- silently acquiring a home day.
CREATE OR REPLACE FUNCTION fn_unmarked_day_type(p_profile uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((
    SELECT j.unmarked_day_type
      FROM profiles p
      JOIN job_type_policies j ON j.job_type = p.job_type
     WHERE p.id = p_profile
  ), 'absent')
$$;

COMMENT ON FUNCTION fn_unmarked_day_type(uuid) IS
  'What a working day with no attendance row means for this person: absent or wfh. Read from their job type policy.';

-- ── The absence job ──────────────────────────────────────────────────────────
-- Same row count, same filters, same working-day rule as before. Only what the
-- row says changes, and only for job types configured to say something else.
CREATE OR REPLACE FUNCTION fn_mark_absent_for_date(d date)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO attendance (profile_id, date, status, day_type, day_part, source, note)
  SELECT p.id, d,
         CASE WHEN u.kind = 'wfh' THEN NULL  ELSE 'absent' END,
         CASE WHEN u.kind = 'wfh' THEN 'wfh' ELSE 'work'   END,
         'full', 'system',
         CASE WHEN u.kind = 'wfh' THEN 'Remote (no office check-in)' END
  FROM profiles p
  CROSS JOIN LATERAL (SELECT fn_unmarked_day_type(p.id) AS kind) u
  WHERE p.is_active
    AND is_internal_profile(p.id)
    AND p.schedule_mode <> 'flexible'
    AND fn_is_working_day_for(p.id, d)
    AND NOT EXISTS (SELECT 1 FROM attendance a WHERE a.profile_id = p.id AND a.date = d)
  ON CONFLICT (profile_id, date) DO NOTHING;

  -- The unworked half of a half-day leave asks the same question and gets the
  -- same answer: it is only an absence for somebody the office expected to see.
  -- For everyone else the half stays unknown rather than becoming a home day --
  -- the row already says 'leave', and day_type holds one fact, not two.
  UPDATE attendance a
  SET status = 'absent', updated_at = now()
  WHERE a.date = d
    AND a.status IS NULL
    AND a.check_in IS NULL
    AND a.day_type = 'leave'
    AND a.day_part <> 'full'
    AND fn_unmarked_day_type(a.profile_id) = 'absent';
END;
$$;

-- Corrective migration for 20260807140000.
--
-- That migration's backfill ran two statements in the wrong order:
--
--   1. map leave/half_day/wfh/holiday -> day_type, and RECOVER the erased
--      attendance fact by setting status from check_in
--   2. UPDATE attendance SET day_type='work' WHERE status IN ('present','late','absent')
--
-- Step 2 was meant for rows that were *already* a plain attendance fact, but it
-- cannot tell those apart from the rows step 1 had just given a status to — so it
-- matched them too and flattened their day_type back to 'work'. The recovered
-- status survived; the leave/WFH fact was lost. Exactly the class of bug this
-- whole change exists to eliminate, reintroduced by statement ordering.
--
-- Not fixed by editing 20260807140000 (applied migrations are never edited). On a
-- fresh replay that migration still flattens these rows and this one repairs them,
-- which is the point of a corrective migration.
--
-- Re-derived from the source of truth rather than guessed: leave_requests and
-- wfh_requests still hold the approvals, and check_in/status on the attendance row
-- were never touched by the faulty statement.
--
-- This also repairs 6 rows that were wrong BEFORE any of this — days where an
-- approved half-day leave never reached the attendance row at all, because the old
-- sync skipped rows with source='self'. That is the original reported bug, and its
-- historical damage is corrected here too.

-- ── Half-day leave that lost (or never had) its day_type ─────────────────────
-- Correlated scalar subquery rather than LATERAL: a FROM/LATERAL item may not
-- reference the UPDATE target, so `a.profile_id` is out of scope there.
UPDATE attendance a
SET day_type = 'leave',
    day_part = (
      SELECT l.day_part FROM leave_requests l
      WHERE l.profile_id = a.profile_id AND l.status = 'approved'
        AND a.date BETWEEN l.start_date AND l.end_date
      ORDER BY (l.day_part <> 'full') DESC
      LIMIT 1
    ),
    updated_at = now()
WHERE a.day_type = 'work'
  AND (
    SELECT l.day_part FROM leave_requests l
    WHERE l.profile_id = a.profile_id AND l.status = 'approved'
      AND a.date BETWEEN l.start_date AND l.end_date
    ORDER BY (l.day_part <> 'full') DESC
    LIMIT 1
  ) <> 'full';

-- ── WFH days that lost their day_type ────────────────────────────────────────
UPDATE attendance a
SET day_type = 'wfh', updated_at = now()
WHERE a.day_type = 'work'
  AND EXISTS (
    SELECT 1 FROM wfh_requests w
    WHERE w.profile_id = a.profile_id AND w.status = 'approved' AND w.date = a.date
  )
  -- Someone's own leave outranks WFH for the same day, matching fn_sync_wfh_to_attendance.
  AND NOT EXISTS (
    SELECT 1 FROM leave_requests l
    WHERE l.profile_id = a.profile_id AND l.status = 'approved'
      AND a.date BETWEEN l.start_date AND l.end_date
  );

-- ── Deliberately NOT converted: approved FULL-day leave with a real check-in ──
-- A person cannot be on leave all day and also have clocked in, so this is
-- contradictory source data, not a mapping error — it predates this work and comes
-- from the old sync refusing to overwrite a source='self' row. Honouring the leave
-- means deleting a genuine check-in; honouring the check-in means ignoring an
-- approved leave. Both destroy a fact, which is the thing this change is meant to
-- stop, so the row is left intact (day_type='work', check-in preserved) for a human
-- to resolve. attendance_no_status_on_full_off_day makes any such row impossible to
-- create from here on, so this cannot recur.
DO $$
DECLARE v_conflicts int;
BEGIN
  SELECT count(*) INTO v_conflicts
  FROM attendance a
  WHERE a.day_type = 'work' AND a.check_in IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM leave_requests l
      WHERE l.profile_id = a.profile_id AND l.status = 'approved'
        AND l.day_part = 'full' AND a.date BETWEEN l.start_date AND l.end_date
    );
  IF v_conflicts > 0 THEN
    RAISE NOTICE 'Left % attendance row(s) with both an approved full-day leave and a real check-in for manual review.', v_conflicts;
  END IF;
END
$$;

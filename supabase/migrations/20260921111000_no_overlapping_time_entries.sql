-- One person cannot log the same minute twice.
--
-- 25 pairs of entries overlapped, double-counting 12.4 of 1,028 tracked hours.
-- Every hours report was overstating, and the error grows with use.
--
-- There was already a partial unique index allowing only one RUNNING timer, and
-- startTimer() stops whatever is running before it starts another. Neither helps:
-- the overlaps were across all four combinations — manual/timer 15, manual/manual
-- 5, timer/timer 5 — because a manually logged stretch and an edited entry can
-- both land on time the clock already covered. A rule enforced in one code path
-- is not a rule.
--
-- EXCLUDE USING gist is the one place to say it once. btree_gist gives the
-- `profile_id WITH =` half; the range half does the overlap test. A running timer
-- is [started_at, infinity), so nothing can be logged into time it still covers.
--
-- The clean-up trims rather than deletes wherever it can: an entry that partly
-- overlaps an earlier one has its start moved to where the earlier one ended, so
-- the part that was genuinely its own survives. Only an entry wholly inside
-- another is removed, because it records nothing the other does not. Result:
-- 754 -> 750 entries, 1028.25h -> 1015.83h, 0 overlaps.
--
-- Audit capture is suppressed for the repair: it is a bulk correction of historic
-- rows, not somebody editing their timesheet.

CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA extensions;

DO $clean$
DECLARE
  r record;
  v_trimmed int := 0;
  v_deleted int := 0;
BEGIN
  PERFORM set_config('app.audit_suppress', 'on', true);

  LOOP
    SELECT b.id AS later_id, a.ended_at AS prev_end, b.ended_at AS later_end
      INTO r
      FROM task_time_entries a
      JOIN task_time_entries b
        ON b.profile_id = a.profile_id
       AND (a.started_at, a.id) < (b.started_at, b.id)
       AND a.ended_at IS NOT NULL
       AND b.ended_at IS NOT NULL
       AND b.started_at < a.ended_at
     ORDER BY b.started_at, b.id
     LIMIT 1;

    EXIT WHEN NOT FOUND;

    IF r.later_end <= r.prev_end THEN
      DELETE FROM task_time_entries WHERE id = r.later_id;
      v_deleted := v_deleted + 1;
    ELSE
      UPDATE task_time_entries SET started_at = r.prev_end WHERE id = r.later_id;
      v_trimmed := v_trimmed + 1;
    END IF;
  END LOOP;

  RAISE NOTICE 'trimmed %, deleted %', v_trimmed, v_deleted;
END
$clean$;

ALTER TABLE public.task_time_entries
  DROP CONSTRAINT IF EXISTS task_time_entries_no_overlap;

ALTER TABLE public.task_time_entries
  ADD CONSTRAINT task_time_entries_no_overlap
  EXCLUDE USING gist (
    profile_id WITH =,
    tstzrange(started_at, COALESCE(ended_at, 'infinity'::timestamptz)) WITH &&
  );

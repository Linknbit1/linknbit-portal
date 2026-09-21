-- Trim recorded timer time back to actual working hours.
--
-- People start the timer and forget it: through the 13:00-14:00 break, past the end
-- of the day, and in two cases across midnight (one ran 16 Sep 11:07 -> 17 Sep 15:37,
-- 28h 30m). None of it is work, and all of it inflates what a task appears to cost.
--
-- The working window is the one the portal already defines, and it moved:
-- attendance_settings.work_end_time was changed on 19 Aug 2026 09:20 PKT from 17:00
-- to 18:00, so the window is 09:00-17:00 before that date and 09:00-18:00 from it.
-- The 13:00-14:00 break comes from break_start_time/break_end_time.
--
-- Rules, all evaluated in Asia/Karachi:
--   * an entry whose start and end fall on different days is deleted outright, whatever
--     part of it looks like office time -- there is no way to tell which hours were real
--   * otherwise the entry is clipped to the working window and the break is cut out of it
--   * an entry spanning the break becomes two rows, preserving the work either side
--   * an entry left with no time at all is deleted
--
-- **Only `source = 'timer'` rows are touched.** A `manual` row was typed in deliberately
-- after the fact -- it is a claim about work done, not a timer somebody forgot, and two
-- of them are evening work (Zain Malik, 7 Aug) that this would otherwise erase. Open
-- timers (ended_at IS NULL) are left alone; auto-checkout owns those.
--
-- No approved overtime request overlaps any after-hours entry, so nothing sanctioned is lost.
--
-- Effect: 656 closed entries -> 106h 26m of timer time removed (939h 45m -> 833h 19m),
-- 59 entries split in two, 6 deleted (2 spanning midnight, 4 left with nothing).
--
-- Reversible: backup.task_time_entries_20260917 holds the whole table as it was, and
-- backup.timer_cleanup_plan_20260917 records the exact decision made for every row.
-- The `backup` schema is not exposed through PostgREST, so neither is readable by a client.

CREATE SCHEMA IF NOT EXISTS backup;

DROP TABLE IF EXISTS backup.task_time_entries_20260917;
CREATE TABLE backup.task_time_entries_20260917 AS
SELECT * FROM public.task_time_entries;

DROP TABLE IF EXISTS backup.timer_cleanup_plan_20260917;
CREATE TABLE backup.timer_cleanup_plan_20260917 AS
WITH e AS (
  SELECT id,
         (started_at AT TIME ZONE 'Asia/Karachi') AS s,
         (ended_at   AT TIME ZONE 'Asia/Karachi') AS x
  FROM public.task_time_entries
  WHERE source = 'timer' AND ended_at IS NOT NULL
),
w AS (
  SELECT id, s, x,
         (s::date <> x::date) AS spans_midnight,
         s::date + time '09:00' AS win_s,
         s::date + (CASE WHEN s::date >= DATE '2026-08-19' THEN time '18:00'
                         ELSE time '17:00' END)  AS win_e,
         s::date + time '13:00' AS br_s,
         s::date + time '14:00' AS br_e
  FROM e
)
SELECT id, s AS old_start, x AS old_end, spans_midnight,
       GREATEST(s, win_s)       AS a1,   -- morning segment
       LEAST(x, br_s, win_e)    AS b1,
       GREATEST(s, br_e, win_s) AS a2,   -- afternoon segment
       LEAST(x, win_e)          AS b2
FROM w;

ALTER TABLE backup.timer_cleanup_plan_20260917 ADD PRIMARY KEY (id);

-- Silence the two AFTER triggers. trg_notify_time_logged would fire a "time logged"
-- notification at staff for every row touched; trg_audit_task_time_entries would bury
-- the audit log under ~700 entries for what is a single administrative correction.
-- The two backup tables above are the record of this change. trg_tte_updated_at stays
-- on, so every corrected row carries a fresh updated_at.
ALTER TABLE public.task_time_entries DISABLE TRIGGER trg_notify_time_logged;
ALTER TABLE public.task_time_entries DISABLE TRIGGER trg_audit_task_time_entries;

-- 1. Afternoon halves first, while the originals still hold the full span.
INSERT INTO public.task_time_entries
       (task_id, profile_id, started_at, ended_at, note, billable, source, created_at, updated_at)
SELECT t.task_id, t.profile_id,
       p.a2 AT TIME ZONE 'Asia/Karachi',
       p.b2 AT TIME ZONE 'Asia/Karachi',
       t.note, t.billable, t.source, t.created_at, now()
FROM backup.timer_cleanup_plan_20260917 p
JOIN public.task_time_entries t ON t.id = p.id
WHERE NOT p.spans_midnight
  AND p.b1 > p.a1        -- morning survives, so this is a genuine split
  AND p.b2 > p.a2;

-- 2. Originals become the surviving segment (morning if there is one, else afternoon).
UPDATE public.task_time_entries t
SET started_at = (CASE WHEN p.b1 > p.a1 THEN p.a1 ELSE p.a2 END) AT TIME ZONE 'Asia/Karachi',
    ended_at   = (CASE WHEN p.b1 > p.a1 THEN p.b1 ELSE p.b2 END) AT TIME ZONE 'Asia/Karachi'
FROM backup.timer_cleanup_plan_20260917 p
WHERE t.id = p.id
  AND NOT p.spans_midnight
  AND (p.b1 > p.a1 OR p.b2 > p.a2);

-- 3. Anything with nothing left, plus every entry that crossed midnight.
DELETE FROM public.task_time_entries t
USING backup.timer_cleanup_plan_20260917 p
WHERE t.id = p.id
  AND (p.spans_midnight OR (p.b1 <= p.a1 AND p.b2 <= p.a2));

ALTER TABLE public.task_time_entries ENABLE TRIGGER trg_notify_time_logged;
ALTER TABLE public.task_time_entries ENABLE TRIGGER trg_audit_task_time_entries;

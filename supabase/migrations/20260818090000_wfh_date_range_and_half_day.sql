-- WFH: single date → date range, plus half-day (partial) WFH.
--
-- WFH requests were the only time-off-shaped request still pinned to one day, so
-- a week of remote work meant five separate rows, five approvals and five
-- notifications. They now carry start_date/end_date/day_part — the exact shape
-- leave_requests already has, so both modules read, group and format the same way.
--
-- "Partial WFH" is deliberately the same vocabulary as a half-day leave:
-- day_part = first_half | second_half means that half is worked from home and the
-- other half from the office. It is therefore a single day by construction, and
-- attendance must be allowed to carry a partial WFH day (the split-columns
-- migration only let leave be partial).

-- ── 1. wfh_requests: date → start_date + end_date + day_part ─────────────────
-- Renamed rather than added-and-dropped so existing rows, the RLS policies and
-- idx_wfh_profile_date all follow the column instead of needing a rebuild.
ALTER TABLE wfh_requests RENAME COLUMN date TO start_date;

ALTER TABLE wfh_requests ADD COLUMN IF NOT EXISTS end_date date;
ALTER TABLE wfh_requests ADD COLUMN IF NOT EXISTS day_part text NOT NULL DEFAULT 'full';

-- Backfilling end_date is a plain UPDATE, which would fire trg_wfh_sync (whose
-- body still reads the pre-rename OLD.date and errors) and stamp every approved
-- request into the audit log for a change nobody made. Both are suppressed for
-- the one statement; the sync functions are replaced further down and the
-- attendance rows they own are unaffected by a backfill that only fills in
-- end_date = start_date.
ALTER TABLE wfh_requests DISABLE TRIGGER trg_wfh_sync;
ALTER TABLE wfh_requests DISABLE TRIGGER trg_audit_wfh_requests;
UPDATE wfh_requests SET end_date = start_date WHERE end_date IS NULL;
ALTER TABLE wfh_requests ENABLE TRIGGER trg_audit_wfh_requests;
ALTER TABLE wfh_requests ENABLE TRIGGER trg_wfh_sync;

ALTER TABLE wfh_requests ALTER COLUMN end_date SET NOT NULL;

ALTER TABLE wfh_requests DROP CONSTRAINT IF EXISTS wfh_requests_day_part_check;
ALTER TABLE wfh_requests ADD CONSTRAINT wfh_requests_day_part_check
  CHECK (day_part IN ('full', 'first_half', 'second_half'));

ALTER TABLE wfh_requests DROP CONSTRAINT IF EXISTS wfh_requests_range_check;
ALTER TABLE wfh_requests ADD CONSTRAINT wfh_requests_range_check
  CHECK (end_date >= start_date);

-- Half of a day cannot span days, same rule the leave form already enforces.
ALTER TABLE wfh_requests DROP CONSTRAINT IF EXISTS wfh_requests_half_day_single;
ALTER TABLE wfh_requests ADD CONSTRAINT wfh_requests_half_day_single
  CHECK (day_part = 'full' OR start_date = end_date);

COMMENT ON COLUMN wfh_requests.start_date IS 'First day of the WFH range (inclusive).';
COMMENT ON COLUMN wfh_requests.end_date IS 'Last day of the WFH range (inclusive); equals start_date for a single day.';
COMMENT ON COLUMN wfh_requests.day_part IS
  'How much of the day is worked from home. full | first_half | second_half; a partial day is a single day and the other half is worked from the office.';

-- ── 2. attendance may now be partially WFH ───────────────────────────────────
-- The split-columns migration allowed day_part <> 'full' only for leave, because
-- leave was the only partial day that existed. WFH is now partial too. Holiday
-- and ordinary work days stay whole-day facts.
ALTER TABLE attendance DROP CONSTRAINT IF EXISTS attendance_day_part_only_for_leave;
ALTER TABLE attendance DROP CONSTRAINT IF EXISTS attendance_day_part_scope;
ALTER TABLE attendance ADD CONSTRAINT attendance_day_part_scope
  CHECK (day_part = 'full' OR day_type IN ('leave', 'wfh'));

COMMENT ON COLUMN attendance.day_part IS
  'How much of the day day_type covers. full | first_half | second_half; only leave and WFH may be partial. A half day off is day_type=leave with day_part<>full; a partial WFH is day_type=wfh with day_part<>full.';

-- ── 3. Notification wording: a span, not a day ───────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_fmt_span(p_start date, p_end date, p_part text DEFAULT 'full')
RETURNS text LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT fn_fmt_day(p_start)
      || CASE WHEN p_end > p_start THEN ' to ' || fn_fmt_day(p_end) ELSE '' END
      || CASE p_part
           WHEN 'first_half'  THEN ' (first half)'
           WHEN 'second_half' THEN ' (second half)'
           ELSE ''
         END;
$$;

COMMENT ON FUNCTION public.fn_fmt_span(date, date, text) IS
  'Human-readable span for notification bodies: "Aug 18", "Aug 18 to Aug 22", "Aug 18 (first half)".';

CREATE OR REPLACE FUNCTION public.fn_notify_wfh_submitted()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_name text;
BEGIN
  SELECT name INTO v_name FROM profiles WHERE id = NEW.profile_id;
  PERFORM fn_notify(a.profile_id, 'request_wfh_submitted', 'WFH request',
                    v_name || ' requested WFH for '
                      || fn_fmt_span(NEW.start_date, NEW.end_date, NEW.day_part),
                    'wfh_request', NEW.id::text, NEW.profile_id)
  FROM fn_request_approvers(NEW.profile_id) a;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_notify_wfh_reviewed()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM fn_notify(NEW.profile_id, 'request_wfh_reviewed',
    'WFH ' || NEW.status,
    'Your WFH request for '
      || fn_fmt_span(NEW.start_date, NEW.end_date, NEW.day_part)
      || ' was ' || NEW.status
      || COALESCE(' — ' || NULLIF(NEW.review_note, ''), '') || '.',
    'wfh_request', NEW.id::text, auth.uid());
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_notify_wfh_granted()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM fn_notify(NEW.profile_id, 'request_wfh_reviewed', 'WFH granted',
                    'You have been granted WFH for '
                      || fn_fmt_span(NEW.start_date, NEW.end_date, NEW.day_part)
                      || COALESCE(' — ' || NULLIF(NEW.reason, ''), '') || '.',
                    'wfh_request', NEW.id::text, auth.uid());
  RETURN NULL;
END;
$$;

-- ── 4. Attendance sync over the range ────────────────────────────────────────
-- Writes one attendance row per WORKING day in the range and carries day_part
-- through, so a partial WFH shows as WFH · 1st rather than a whole remote day.
--
-- Two things the single-date version got away with and a range must not:
--   * the revert must not flatten a day that a COMPANY WFH day also covers —
--     fn_company_wfh_revert has always guarded the mirror case, this side never
--     did, and a multi-day range makes the overlap far more likely;
--   * the revert must reset day_part too, or an un-approved partial WFH would
--     leave a work day stuck on 'first_half'.
CREATE OR REPLACE FUNCTION public.fn_sync_wfh_to_attendance()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (TG_OP = 'UPDATE' OR TG_OP = 'DELETE') AND OLD.status = 'approved' THEN
    UPDATE attendance a
    SET day_type = CASE
          WHEN EXISTS (SELECT 1 FROM company_wfh_days c WHERE c.date = a.date)
          THEN 'wfh' ELSE 'work' END,
        day_part = 'full',
        updated_at = now()
    WHERE a.profile_id = OLD.profile_id
      AND a.date BETWEEN OLD.start_date AND OLD.end_date
      AND a.day_type = 'wfh';

    DELETE FROM attendance a
    WHERE a.profile_id = OLD.profile_id
      AND a.date BETWEEN OLD.start_date AND OLD.end_date
      AND a.source = 'system' AND a.day_type = 'work'
      AND a.check_in IS NULL AND a.status IS NULL;
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;

  IF NEW.status = 'approved' THEN
    -- WFH is a location, not an absence: a check-in on a WFH day stays intact.
    INSERT INTO attendance (profile_id, date, day_type, day_part, status, source, marked_by, note)
    SELECT NEW.profile_id, g.d::date, 'wfh', NEW.day_part, NULL, 'system', NEW.reviewed_by,
           'Work from home'
           || CASE NEW.day_part
                WHEN 'first_half'  THEN ' (first half)'
                WHEN 'second_half' THEN ' (second half)'
                ELSE ''
              END
    FROM generate_series(NEW.start_date, NEW.end_date, interval '1 day') g(d)
    WHERE fn_is_working_day(g.d::date)
    ON CONFLICT (profile_id, date) DO UPDATE
      SET day_type = 'wfh',
          day_part = EXCLUDED.day_part,
          marked_by = EXCLUDED.marked_by,
          note = EXCLUDED.note,
          updated_at = now()
      WHERE attendance.day_type <> 'leave';   -- leave outranks WFH for the same day
  END IF;
  RETURN NEW;
END;
$$;

-- ── 5. Company WFH days vs personal WFH ──────────────────────────────────────
-- A company-wide WFH day is a whole day for everyone, so it overrides a personal
-- partial WFH while it stands...
CREATE OR REPLACE FUNCTION public.fn_company_wfh_apply()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT fn_is_working_day(NEW.date) THEN RETURN NEW; END IF;

  INSERT INTO attendance (profile_id, date, day_type, day_part, status, source, marked_by, note)
  SELECT p.id, NEW.date, 'wfh', 'full', NULL, 'system', NEW.created_by, 'Company WFH — ' || NEW.reason
  FROM profiles p
  WHERE p.is_active
    AND p.role NOT IN ('client_owner','client_member')
    AND NOT p.attendance_excluded
  ON CONFLICT (profile_id, date) DO UPDATE
    SET day_type = 'wfh', day_part = 'full', marked_by = EXCLUDED.marked_by,
        note = EXCLUDED.note, updated_at = now()
    WHERE attendance.day_type <> 'leave';   -- someone's own leave outranks a company WFH day
  RETURN NEW;
END;
$$;

-- ...and removing it restores whatever the person's own approved WFH said,
-- day_part included, instead of assuming everyone was back in the office.
CREATE OR REPLACE FUNCTION public.fn_company_wfh_revert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE attendance a
  SET day_type = CASE WHEN EXISTS (
        SELECT 1 FROM wfh_requests w
        WHERE w.profile_id = a.profile_id AND w.status = 'approved'
          AND a.date BETWEEN w.start_date AND w.end_date
      ) THEN 'wfh' ELSE 'work' END,
      day_part = COALESCE((
        SELECT w.day_part FROM wfh_requests w
        WHERE w.profile_id = a.profile_id AND w.status = 'approved'
          AND a.date BETWEEN w.start_date AND w.end_date
        -- A whole remote day beats a half one when both cover the date.
        ORDER BY (w.day_part = 'full') DESC
        LIMIT 1), 'full'),
      updated_at = now()
  WHERE a.date = OLD.date
    AND a.day_type = 'wfh';

  DELETE FROM attendance a
  WHERE a.date = OLD.date AND a.source = 'system'
    AND a.day_type = 'work' AND a.check_in IS NULL AND a.status IS NULL;
  RETURN OLD;
END;
$$;

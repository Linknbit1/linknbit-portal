-- Half-day leave: a leave request can cover a full day or one half of a single day.
-- A half-day deducts 0.5 from the leave-type quota, so two half-days equal one leave
-- day. `days` becomes fractional to support this.

-- ── day_part column ───────────────────────────────────────────────────────────
ALTER TABLE leave_requests
  ADD COLUMN day_part text NOT NULL DEFAULT 'full'
  CHECK (day_part IN ('full', 'first_half', 'second_half'));

-- ── days must support 0.5 increments ──────────────────────────────────────────
ALTER TABLE leave_requests
  ALTER COLUMN days TYPE numeric(4,1) USING days::numeric;

-- ── Recompute working-day count, honouring half-day requests ───────────────────
-- Half-day must be a single calendar day and counts as 0.5 working days (0 if the
-- day is not a working day). Full-day requests keep the working-day count of the range.
CREATE OR REPLACE FUNCTION fn_set_leave_days()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.day_part <> 'full' THEN
    IF NEW.start_date <> NEW.end_date THEN
      RAISE EXCEPTION 'Half-day leave must be a single day';
    END IF;
    NEW.days := CASE WHEN fn_is_working_day(NEW.start_date) THEN 0.5 ELSE 0 END;
  ELSE
    NEW.days := (
      SELECT count(*) FROM generate_series(NEW.start_date, NEW.end_date, interval '1 day') g(d)
      WHERE fn_is_working_day(g.d::date)
    );
  END IF;
  RETURN NEW;
END;
$$;

-- day_part participates in the calculation, so the trigger must also fire on it.
DROP TRIGGER IF EXISTS trg_leave_set_days ON leave_requests;
CREATE TRIGGER trg_leave_set_days
  BEFORE INSERT OR UPDATE OF start_date, end_date, day_part ON leave_requests
  FOR EACH ROW EXECUTE FUNCTION fn_set_leave_days();

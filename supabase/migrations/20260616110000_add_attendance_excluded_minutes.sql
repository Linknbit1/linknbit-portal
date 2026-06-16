-- Worked-hours adjustment column.
-- When an employee leaves on an approved out-of-office (OOO) exception and returns the
-- same day (two-session model), the away time is recorded here and subtracted from the
-- computed worked hours (check_out - check_in - excluded_minutes). Also used by the
-- auto-checkout job for OOO departures that never return.
ALTER TABLE attendance
  ADD COLUMN excluded_minutes integer NOT NULL DEFAULT 0;

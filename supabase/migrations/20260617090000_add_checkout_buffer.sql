-- Checkout buffer: minutes after work_end_time during which an early-ish checkout
-- still counts as a full day with zero overtime. Worked time is capped at
-- work_end_time when checkout falls within [work_end, work_end + buffer]; checkouts
-- beyond the buffer accrue overtime measured from work_end_time. Consumed by the
-- monthly-hours report computation only — no trigger reads this column.
ALTER TABLE attendance_settings
  ADD COLUMN checkout_buffer_min integer NOT NULL DEFAULT 30
  CHECK (checkout_buffer_min >= 0);

-- Check-in-only biometric model: the first punch of the day is the arrival and
-- every later punch is an extra scan with no attendance effect. Two new
-- resolution labels make the raw-punch audit trail honest:
--   ignored_extra  — a punch after the day's check-in (was mislabelled before)
--   ignored_exempt — a punch by an attendance-exempt member (previously reused
--                    'ignored_unpaired', which the audit notes flagged as wrong)
--
-- The retired labels (check_out, ooo_out, ooo_in, ignored_below_threshold,
-- ignored_unpaired) stay in the CHECK so historical rows remain valid; the code
-- simply no longer produces them.

ALTER TABLE biometric_punches DROP CONSTRAINT IF EXISTS biometric_punches_resolution_check;
ALTER TABLE biometric_punches ADD CONSTRAINT biometric_punches_resolution_check
  CHECK (resolution IN (
    'pending',
    'check_in',
    'check_out',
    'ooo_out',
    'ooo_in',
    'unmatched_user',
    'ignored_below_threshold',
    'ignored_unpaired',
    'ignored_holiday',
    'ignored_weekend',
    'ignored_leave',
    'ignored_wfh',
    'ignored_extra',
    'ignored_exempt'
  ));

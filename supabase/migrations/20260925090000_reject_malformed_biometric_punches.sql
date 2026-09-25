-- Stop the terminal relay writing frame garbage into the punch log.
--
-- 124 rows were junk. Two shapes, one cause:
--
--   122 rows had a zk_user_id beginning with byte 0x01 — SOH, the ZKTeco packet
--       start marker — followed by two to four more bytes of packet payload
--       ('\x01\x69\x32\x04', '\x01M=13', and so on). Each appeared exactly once.
--   2 rows carried a VALID user id (1 and 5) but the same 2000-01-01 timestamp.
--
--   All 124 landed on 2000-01-01 00:00:00, which is the ZKTeco device epoch —
--   what the clock reads when the timestamp bytes fail to decode.
--
-- So the relay was mis-framing the device's attendance log: it lost byte
-- alignment and read packet headers as records, producing an id out of header
-- bytes and a timestamp out of nothing. It ran from 19 Aug to 24 Sep, a row at a
-- time, so it is a live fault rather than one bad import.
--
-- None of the 122 produced attendance: no profile matched, so nothing propagated.
-- The other two were saved by accident — 2000-01-01 was a Saturday, so the
-- pipeline filed them as 'ignored_weekend'. A corrupt row landing on a weekday
-- would have written a real attendance record for a real person.
--
-- These two constraints make the relay's next mis-framed frame fail loudly at the
-- edge function rather than quietly become somebody's attendance.

DELETE FROM biometric_punches
 WHERE zk_user_id ~ '[\x00-\x1F]'
    OR punched_at < '2020-01-01';

ALTER TABLE public.biometric_punches
  DROP CONSTRAINT IF EXISTS biometric_punches_zk_user_id_numeric;
ALTER TABLE public.biometric_punches
  ADD CONSTRAINT biometric_punches_zk_user_id_numeric
  CHECK (zk_user_id ~ '^[0-9]+$');

ALTER TABLE public.biometric_punches
  DROP CONSTRAINT IF EXISTS biometric_punches_punched_at_plausible;
ALTER TABLE public.biometric_punches
  ADD CONSTRAINT biometric_punches_punched_at_plausible
  CHECK (punched_at >= '2020-01-01'::timestamptz);

COMMENT ON CONSTRAINT biometric_punches_zk_user_id_numeric ON public.biometric_punches IS
  'Enroll numbers are digits. Anything else is a mis-framed device packet, not a person.';
COMMENT ON CONSTRAINT biometric_punches_punched_at_plausible ON public.biometric_punches IS
  '2000-01-01 is the ZKTeco epoch — what a punch reads when its timestamp bytes fail to decode.';

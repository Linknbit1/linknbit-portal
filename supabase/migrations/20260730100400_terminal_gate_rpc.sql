-- Replaces get_terminal_status() with a single answer to the only question the
-- check-in card actually has: "should *I* be using the terminal right now?"
--
-- Deciding this server-side matters because the answer must match what
-- attendance-checkin enforces. If the UI computed it from job_type_policies plus
-- a heartbeat threshold of its own, the two could disagree and a member would see
-- a check-in button that always 403s (or be told to use a terminal that is down).
--
-- The staleness threshold now lives in attendance_settings so the SQL and the
-- edge function read one value instead of each hardcoding 10 minutes.

ALTER TABLE attendance_settings
  ADD COLUMN IF NOT EXISTS terminal_stale_min int NOT NULL DEFAULT 10;

COMMENT ON COLUMN attendance_settings.terminal_stale_min IS
  'Minutes without a Pi heartbeat before a terminal counts as down and portal check-in re-opens.';

DROP FUNCTION IF EXISTS public.get_terminal_status();

CREATE OR REPLACE FUNCTION public.get_my_terminal_gate()
RETURNS TABLE (
  must_use_terminal boolean,
  terminal_name     text,
  terminal_location text,
  last_heartbeat_at timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE AS $$
DECLARE
  v_gated  boolean := false;
  v_stale  int;
  v_name   text;
  v_loc    text;
  v_beat   timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  SELECT coalesce(p.terminal_stale_min, 10) INTO v_stale FROM attendance_settings p;

  SELECT coalesce(jtp.attendance_via_terminal, false)
    INTO v_gated
    FROM profiles pr
    LEFT JOIN job_type_policies jtp ON jtp.job_type = pr.job_type
   WHERE pr.id = auth.uid();

  -- Freshest active terminal; a NULL heartbeat sorts last so a never-reported
  -- terminal never wins over a live one.
  SELECT t.name, t.location, t.last_heartbeat_at
    INTO v_name, v_loc, v_beat
    FROM biometric_terminals t
   WHERE t.is_active
   ORDER BY t.last_heartbeat_at DESC NULLS LAST
   LIMIT 1;

  RETURN QUERY SELECT
    coalesce(v_gated, false)
      AND v_beat IS NOT NULL
      AND v_beat >= now() - make_interval(mins => v_stale),
    v_name,
    v_loc,
    v_beat;
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_terminal_gate() FROM anon;

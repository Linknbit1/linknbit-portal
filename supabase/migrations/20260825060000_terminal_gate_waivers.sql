-- The terminal gate learns the two cases where the terminal is not the answer.
--
-- get_my_terminal_gate() decides what the check-in card shows, and it has to
-- agree with what attendance-checkin will actually accept — a card that hides
-- the button in front of somebody the edge function would have let in is the
-- same bug as a button that always 403s. attendance-checkin now waives the
-- terminal in two situations, so this must waive it in the same two:
--
--   1. An approved WFH day. The employee is at home; there is no terminal
--      within reach. This is the reported bug: on-site staff on an approved
--      WFH day were shown a check-in button (the card reads day_type, not the
--      gate) and every press came back "Please check in at the biometric
--      terminal", so a WFH day could not be marked at all while the Pi was up.
--
--   2. The request arrives from the office network. Being on the office WiFi
--      demonstrates the same thing a finger on the reader does — that the
--      person is in the building — so the portal button is allowed to stand in
--      for the terminal.
--
-- The client IP comes from PostgREST's request.headers GUC. CF-Connecting-IP is
-- preferred over X-Forwarded-For because Cloudflare APPENDS to a client-supplied
-- X-Forwarded-For: its left-most entry is attacker-typed, while a request that
-- tries to send its own CF-Connecting-IP is rejected at the edge. The same
-- preference is applied in the edge functions (resolveClientIp).
--
-- Return columns are ADDED, never renamed or removed, so a browser still running
-- the previous bundle keeps reading must_use_terminal exactly as before.

DROP FUNCTION IF EXISTS public.get_my_terminal_gate();

CREATE FUNCTION public.get_my_terminal_gate()
RETURNS TABLE (
  must_use_terminal boolean,
  terminal_name     text,
  terminal_location text,
  last_heartbeat_at timestamptz,
  on_office_network boolean,
  wfh_today         boolean
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE AS $$
DECLARE
  v_gated     boolean := false;
  v_stale     int;
  v_cidr      text;
  v_tz        text;
  v_name      text;
  v_loc       text;
  v_beat      timestamptz;
  v_headers   json;
  v_raw_ip    text;
  v_ip        inet;
  v_office    inet;
  v_in_office boolean := false;
  v_wfh       boolean := false;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  SELECT coalesce(s.terminal_stale_min, 10),
         btrim(coalesce(s.office_ip_cidr, '')),
         coalesce(s.timezone, 'Asia/Karachi')
    INTO v_stale, v_cidr, v_tz
    FROM attendance_settings s;

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

  -- Waiver 1: an approved WFH day that has not been checked into yet. Keyed on
  -- day_type alone, matching classifyExistingRow() — a partial WFH day waives it
  -- too, and the office half is covered by the office-network waiver anyway.
  SELECT true
    INTO v_wfh
    FROM attendance a
   WHERE a.profile_id = auth.uid()
     AND a.date = (now() AT TIME ZONE v_tz)::date
     AND a.day_type = 'wfh'
     AND a.check_in IS NULL;
  v_wfh := coalesce(v_wfh, false);

  -- Waiver 2: the request is coming from the office network. Wrapped because
  -- neither the GUC (absent outside PostgREST) nor the stored CIDR (typed by an
  -- admin) is guaranteed parseable, and an unreadable address must mean "not in
  -- the office", never an error on a page that is only trying to draw a button.
  IF v_cidr <> '' THEN
    BEGIN
      v_headers := nullif(current_setting('request.headers', true), '')::json;
      v_raw_ip := coalesce(
        nullif(btrim(coalesce(v_headers ->> 'cf-connecting-ip', '')), ''),
        nullif(btrim(split_part(coalesce(v_headers ->> 'x-forwarded-for', ''), ',', 1)), '')
      );

      IF v_raw_ip IS NOT NULL THEN
        v_ip     := v_raw_ip::inet;
        v_office := v_cidr::inet;
        v_in_office := family(v_ip) = 4 AND family(v_office) = 4 AND v_ip <<= v_office;
      END IF;
    EXCEPTION WHEN others THEN
      v_in_office := false;
    END;
  END IF;

  RETURN QUERY SELECT
    v_gated
      AND NOT v_wfh
      AND NOT v_in_office
      AND v_beat IS NOT NULL
      AND v_beat >= now() - make_interval(mins => v_stale),
    v_name,
    v_loc,
    v_beat,
    v_in_office,
    v_wfh;
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_terminal_gate() FROM anon;

-- Keep office_ip_cidr in step with the office's real public IP.
--
-- The problem: the WiFi gate on portal check-in compares the phone's
-- X-Forwarded-For against attendance_settings.office_ip_cidr. That IP is handed
-- out by the ISP and changes whenever the router reboots — after which every
-- on-site check-in is rejected with "wrong_network" until an admin notices and
-- retypes the CIDR by hand.
--
-- The fix, and why it needs no third-party service: the Raspberry Pi bridge
-- already POSTs a heartbeat from inside the office every minute, so the edge
-- function *observes* the office's public IP on each of those requests, through
-- exactly the same proxy that stamps X-Forwarded-For on an employee's check-in.
-- Asking api.ipify.org would answer a slightly different question ("what does
-- ipify see?") and adds an outage surface; the connection we already have is
-- both authoritative and free. The Pi still resolves its own public IP
-- independently and sends it along, purely as a cross-check (see p_reported_ip).
--
-- The admin's chosen granularity is preserved: a /24 stays a /24, and the CIDR
-- is only rewritten when the observed IP falls OUTSIDE it — i.e. only when the
-- gate would actually have started rejecting people.

ALTER TABLE attendance_settings
  ADD COLUMN office_ip_auto_update   boolean NOT NULL DEFAULT true,
  ADD COLUMN office_ip_last_observed text,
  ADD COLUMN office_ip_updated_at    timestamptz;

COMMENT ON COLUMN attendance_settings.office_ip_auto_update IS
  'When on, an active biometric terminal keeps office_ip_cidr pointed at the IP its heartbeats arrive from.';
COMMENT ON COLUMN attendance_settings.office_ip_last_observed IS
  'Last public IP a terminal heartbeat was seen coming from. Written even when auto-update is off.';
COMMENT ON COLUMN attendance_settings.office_ip_updated_at IS
  'When office_ip_cidr was last rewritten automatically.';

-- ── The sync itself ──────────────────────────────────────────────────────────
-- Lives in SQL rather than the edge function for three reasons: Postgres' inet
-- type does the CIDR arithmetic correctly for free, the audit-suppression GUC is
-- transaction-local (so it only works if the UPDATE happens in the same
-- transaction that sets it), and the whole decision then reads in one place.
--
-- Returns a jsonb status so the Pi's log says exactly what happened:
--   updated | unchanged | disabled | not_configured
--   mismatch | invalid_current_cidr | not_public | not_ipv4 | invalid_ip
CREATE OR REPLACE FUNCTION fn_terminal_sync_office_ip(
  p_terminal_name text,
  p_observed_ip   text,
  p_reported_ip   text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ip        inet;
  v_current   inet;
  v_new       cidr;
  v_settings  attendance_settings%ROWTYPE;
  v_is_new_ip boolean;
BEGIN
  IF p_observed_ip IS NULL OR btrim(p_observed_ip) = '' THEN
    RETURN jsonb_build_object('status', 'invalid_ip');
  END IF;

  BEGIN
    v_ip := btrim(p_observed_ip)::inet;
  EXCEPTION WHEN others THEN
    RETURN jsonb_build_object('status', 'invalid_ip', 'observed', p_observed_ip);
  END;

  -- ipInCidr() in the edge function is IPv4-only. If the Pi happens to reach us
  -- over IPv6 while employees' phones present IPv4, writing that address would
  -- lock the office out — so v6 is observed and ignored, never stored.
  IF family(v_ip) <> 4 THEN
    RETURN jsonb_build_object('status', 'not_ipv4', 'observed', host(v_ip));
  END IF;

  -- A private/CGNAT/loopback source means something is proxying the request; it
  -- is not an address any employee's phone will ever present.
  IF v_ip <<= ANY (ARRAY[
        '10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16',
        '127.0.0.0/8', '169.254.0.0/16', '100.64.0.0/10',
        '0.0.0.0/8', '224.0.0.0/4'
     ]::inet[]) THEN
    RETURN jsonb_build_object('status', 'not_public', 'observed', host(v_ip));
  END IF;

  SELECT * INTO v_settings FROM attendance_settings WHERE singleton;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'not_configured');
  END IF;

  v_is_new_ip := v_settings.office_ip_last_observed IS DISTINCT FROM host(v_ip);

  -- Nothing this function writes is a human action, and the generic
  -- attendance_settings audit trigger would otherwise file a "settings updated"
  -- warning with no actor every time the ISP hands out a new address.
  -- is_local => reverts at the end of this transaction; honoured only when
  -- auth.uid() IS NULL, so a signed-in session can never use it to hide edits.
  PERFORM set_config('app.audit_suppress', 'on', true);

  -- ── Cross-check. The Pi resolves its own public IP from an outside service;
  --    if that disagrees with the address we see the request coming from, the
  --    Pi is reaching Supabase by some other path (VPN, tethering, a second WAN)
  --    and that address is NOT the one employees' phones will present. Record
  --    it, flag it once, change nothing.
  IF p_reported_ip IS NOT NULL AND btrim(p_reported_ip) <> ''
     AND btrim(p_reported_ip) <> host(v_ip) THEN
    IF v_is_new_ip THEN
      UPDATE attendance_settings
         SET office_ip_last_observed = host(v_ip)
       WHERE singleton;

      INSERT INTO audit_log (
        module, table_name, operation, action, severity,
        actor_id, actor_name, actor_kind, subject_id, subject_name,
        summary, flagged, flag_reason, context
      ) VALUES (
        'attendance', 'attendance_settings', 'UPDATE',
        'attendance.office_ip_mismatch', 'warning',
        NULL, p_terminal_name, 'device', NULL, NULL,
        format('Terminal %s reports public IP %s but its requests arrive from %s — office IP left unchanged.',
               p_terminal_name, btrim(p_reported_ip), host(v_ip)),
        true,
        'The terminal appears to reach the server over a different network than the office WiFi. Automatic office-IP update was skipped to avoid locking out check-in.',
        jsonb_build_object('observed', host(v_ip), 'reported', btrim(p_reported_ip), 'terminal', p_terminal_name)
      );
    END IF;

    RETURN jsonb_build_object(
      'status', 'mismatch', 'observed', host(v_ip), 'reported', btrim(p_reported_ip));
  END IF;

  IF v_is_new_ip THEN
    UPDATE attendance_settings SET office_ip_last_observed = host(v_ip) WHERE singleton;
  END IF;

  IF NOT v_settings.office_ip_auto_update THEN
    RETURN jsonb_build_object('status', 'disabled', 'observed', host(v_ip));
  END IF;

  -- A blank CIDR means WiFi enforcement is deliberately off. Auto-update keeps an
  -- existing rule correct; it never switches enforcement on by itself. The admin
  -- seeds it once (the Attendance settings page offers the observed IP one click
  -- away) and it maintains itself from then on.
  IF v_settings.office_ip_cidr IS NULL OR btrim(v_settings.office_ip_cidr) = '' THEN
    RETURN jsonb_build_object('status', 'not_configured', 'observed', host(v_ip));
  END IF;

  -- Parsed as inet, not cidr: an admin may legitimately have typed a host address
  -- with a prefix ('203.101.45.9/24'), which ::cidr rejects but ::inet accepts.
  BEGIN
    v_current := btrim(v_settings.office_ip_cidr)::inet;
  EXCEPTION WHEN others THEN
    RETURN jsonb_build_object(
      'status', 'invalid_current_cidr', 'observed', host(v_ip),
      'current', v_settings.office_ip_cidr);
  END;

  IF family(v_current) <> 4 THEN
    RETURN jsonb_build_object('status', 'invalid_current_cidr', 'observed', host(v_ip));
  END IF;

  -- Still inside the configured range: the gate works, so leave the admin's
  -- value exactly as they wrote it. This is the case that makes a /24 or /16
  -- survive — only an IP that falls outside forces a rewrite.
  IF v_ip <<= v_current THEN
    RETURN jsonb_build_object(
      'status', 'unchanged', 'observed', host(v_ip), 'cidr', v_current::text);
  END IF;

  -- Rewrite at the SAME prefix length the admin chose. Casting to cidr zeroes the
  -- host bits, so 39.40.7.9 against a /24 becomes 39.40.7.0/24, not 39.40.7.9/24.
  v_new := set_masklen(v_ip, masklen(v_current))::cidr;

  UPDATE attendance_settings
     SET office_ip_cidr        = v_new::text,
         office_ip_last_observed = host(v_ip),
         office_ip_updated_at  = now()
   WHERE singleton;

  INSERT INTO audit_log (
    module, table_name, operation, action, severity,
    actor_id, actor_name, actor_kind, subject_id, subject_name,
    summary, flagged, flag_reason, context
  ) VALUES (
    'attendance', 'attendance_settings', 'UPDATE',
    'attendance.office_ip_auto_updated', 'warning',
    NULL, p_terminal_name, 'device', NULL, NULL,
    format('Office IP range changed from %s to %s automatically — terminal %s is now reaching the server from %s.',
           btrim(v_settings.office_ip_cidr), v_new::text, p_terminal_name, host(v_ip)),
    true,
    'The office public IP changed (typically an ISP lease renewal after a router restart). The WiFi check-in rule was updated to match; review it if this was not expected.',
    jsonb_build_object(
      'terminal',  p_terminal_name,
      'observed',  host(v_ip),
      'old_cidr',  btrim(v_settings.office_ip_cidr),
      'new_cidr',  v_new::text,
      'prefix_len', masklen(v_current))
  );

  RETURN jsonb_build_object(
    'status', 'updated', 'observed', host(v_ip),
    'old_cidr', btrim(v_settings.office_ip_cidr), 'cidr', v_new::text);
END;
$$;

-- Only the edge function (service_role) may call this: the observed IP is an
-- argument, so an ordinary session with EXECUTE could point the office range
-- anywhere it liked and walk straight through the WiFi gate.
REVOKE ALL ON FUNCTION fn_terminal_sync_office_ip(text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION fn_terminal_sync_office_ip(text, text, text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION fn_terminal_sync_office_ip(text, text, text) TO service_role;

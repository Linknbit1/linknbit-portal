-- RPCs for managing biometric terminals and enroll-number links.
--
-- Secrets are hashed with pgcrypto server-side rather than in the browser:
-- crypto.subtle is undefined in a non-secure context, so a client-side hash would
-- break whenever the portal is opened over plain HTTP on a LAN IP — which is
-- exactly how this gets tested on the office network.
--
-- All three are SECURITY DEFINER and gate on has_feature('can_manage_attendance'),
-- because they write columns (secret_hash, profiles.zk_user_id) that no role is
-- granted direct write access to.

-- ── Create a terminal ──────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.create_biometric_terminal(
  p_name      text,
  p_location  text DEFAULT NULL,
  p_device_ip text DEFAULT NULL,
  p_secret    text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid;
BEGIN
  IF NOT has_feature('can_manage_attendance') THEN
    RAISE EXCEPTION 'Not authorised to manage attendance terminals';
  END IF;
  IF coalesce(trim(p_name), '') = '' THEN
    RAISE EXCEPTION 'Terminal name is required';
  END IF;
  -- 32 hex chars is the shortest thing worth calling a shared secret here; the
  -- provisioning script mints 64.
  IF length(coalesce(p_secret, '')) < 32 THEN
    RAISE EXCEPTION 'Terminal secret must be at least 32 characters';
  END IF;

  INSERT INTO biometric_terminals (name, location, device_ip, secret_hash)
  VALUES (
    trim(p_name),
    nullif(trim(coalesce(p_location, '')), ''),
    nullif(trim(coalesce(p_device_ip, '')), ''),
    encode(digest(p_secret, 'sha256'), 'hex')
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- ── Rotate a terminal secret ───────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.rotate_biometric_terminal_secret(
  p_id     uuid,
  p_secret text
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT has_feature('can_manage_attendance') THEN
    RAISE EXCEPTION 'Not authorised to manage attendance terminals';
  END IF;
  IF length(coalesce(p_secret, '')) < 32 THEN
    RAISE EXCEPTION 'Terminal secret must be at least 32 characters';
  END IF;

  UPDATE biometric_terminals
     SET secret_hash = encode(digest(p_secret, 'sha256'), 'hex'),
         updated_at  = now()
   WHERE id = p_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Terminal not found';
  END IF;
END;
$$;

-- ── Link / unlink an enroll number ─────────────────────────────────────────────

-- Returns how many previously-unmatched punches were adopted, so the UI can tell
-- the admin whether a follow-up reconcile is needed for historical days.
CREATE OR REPLACE FUNCTION public.link_zk_enrollment(
  p_profile_id uuid,
  p_zk_user_id text
)
RETURNS TABLE (adopted_punches int, affected_dates date[])
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_zk    text := nullif(trim(p_zk_user_id), '');
  v_taken uuid;
  v_dates date[];
  v_count int;
BEGIN
  IF NOT has_feature('can_manage_attendance') THEN
    RAISE EXCEPTION 'Not authorised to manage attendance terminals';
  END IF;
  IF v_zk IS NULL THEN
    RAISE EXCEPTION 'Enroll number is required';
  END IF;

  SELECT id INTO v_taken FROM profiles WHERE zk_user_id = v_zk AND id <> p_profile_id;
  IF v_taken IS NOT NULL THEN
    RAISE EXCEPTION 'Enroll number % is already linked to another member', v_zk;
  END IF;

  UPDATE profiles SET zk_user_id = v_zk WHERE id = p_profile_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Member not found';
  END IF;

  -- Adopt punches recorded before the link existed so no history is lost.
  WITH adopted AS (
    UPDATE biometric_punches
       SET profile_id = p_profile_id,
           resolution = 'pending',
           processed_at = NULL
     WHERE zk_user_id = v_zk AND profile_id IS NULL
    RETURNING local_date
  )
  SELECT count(*)::int, coalesce(array_agg(DISTINCT local_date), '{}')
    INTO v_count, v_dates
    FROM adopted;

  RETURN QUERY SELECT v_count, v_dates;
END;
$$;

CREATE OR REPLACE FUNCTION public.unlink_zk_enrollment(p_profile_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT has_feature('can_manage_attendance') THEN
    RAISE EXCEPTION 'Not authorised to manage attendance terminals';
  END IF;

  -- Existing punches keep their profile_id: they are historical fact, and
  -- detaching them would silently rewrite past attendance.
  UPDATE profiles SET zk_user_id = NULL WHERE id = p_profile_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_biometric_terminal(text, text, text, text) FROM anon;
REVOKE ALL ON FUNCTION public.rotate_biometric_terminal_secret(uuid, text) FROM anon;
REVOKE ALL ON FUNCTION public.link_zk_enrollment(uuid, text) FROM anon;
REVOKE ALL ON FUNCTION public.unlink_zk_enrollment(uuid) FROM anon;

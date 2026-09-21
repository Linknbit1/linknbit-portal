-- Let the person form set the employment period.
--
-- 20260921100000 added joined_on/left_on; this lets a manager correct them. The
-- backfill was derived from the earliest evidence somebody was working here, which
-- is a good guess and not the same thing as a hire date.
--
-- p_left_on is TEXT rather than DATE on purpose. The form needs to say three
-- things, and a date can only say two: NULL leaves the value alone, '' clears it
-- (somebody has come back), a date sets it. The same trick the function already
-- uses for p_allowed_check_in.
--
-- DROP + CREATE rather than CREATE OR REPLACE because adding parameters makes a
-- new signature; replacing in place would leave two overloads and every call
-- would resolve ambiguously. One transaction, so no request sees it missing, and
-- the grant is restored explicitly because DROP takes it with it.

DROP FUNCTION IF EXISTS public.admin_update_profile_role(uuid, text, uuid, text, text, boolean, text, smallint[]);

CREATE FUNCTION public.admin_update_profile_role(
  p_profile_id uuid,
  p_role text,
  p_designation_id uuid DEFAULT NULL::uuid,
  p_job_type text DEFAULT NULL::text,
  p_allowed_check_in text DEFAULT NULL::text,
  p_attendance_excluded boolean DEFAULT NULL::boolean,
  p_schedule_mode text DEFAULT NULL::text,
  p_work_days smallint[] DEFAULT NULL::smallint[],
  p_joined_on date DEFAULT NULL::date,
  p_left_on text DEFAULT NULL::text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_target_role text;
  v_mode text;
BEGIN
  SELECT role INTO v_target_role FROM profiles WHERE id = p_profile_id;
  IF v_target_role IS NULL THEN RAISE EXCEPTION 'profile_not_found'; END IF;

  IF p_profile_id = auth.uid() AND p_role <> v_target_role THEN
    RAISE EXCEPTION 'cannot_change_own_role';
  END IF;

  IF NOT can_manage_target(v_target_role) THEN RAISE EXCEPTION 'forbidden_target'; END IF;

  IF p_role NOT IN ('super_admin','admin','project_manager','team_lead','employee','hr','finance') THEN
    RAISE EXCEPTION 'invalid_role';
  END IF;
  IF NOT can_grant_role(p_role) THEN RAISE EXCEPTION 'forbidden_role'; END IF;

  IF p_designation_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM designations WHERE id = p_designation_id AND is_active = true
  ) THEN
    RAISE EXCEPTION 'invalid_designation';
  END IF;

  IF p_job_type IS NOT NULL AND p_job_type NOT IN ('on_site','hybrid','remote') THEN
    RAISE EXCEPTION 'invalid_job_type';
  END IF;

  IF p_schedule_mode IS NOT NULL AND p_schedule_mode NOT IN ('company','custom_days','flexible') THEN
    RAISE EXCEPTION 'invalid_schedule_mode';
  END IF;

  v_mode := COALESCE(p_schedule_mode, (SELECT schedule_mode FROM profiles WHERE id = p_profile_id));
  IF v_mode = 'custom_days' AND COALESCE(array_length(p_work_days, 1), 0) = 0 THEN
    RAISE EXCEPTION 'work_days_required';
  END IF;

  IF p_joined_on IS NOT NULL AND p_joined_on > CURRENT_DATE + 365 THEN
    RAISE EXCEPTION 'joined_on_too_far_ahead';
  END IF;

  UPDATE profiles
  SET role = p_role,
      designation_id = p_designation_id,
      job_type = COALESCE(p_job_type, job_type),
      allowed_check_in = CASE
        WHEN p_allowed_check_in IS NULL THEN allowed_check_in
        WHEN p_allowed_check_in = ''   THEN NULL
        ELSE p_allowed_check_in::time
      END,
      attendance_excluded = COALESCE(p_attendance_excluded, attendance_excluded),
      schedule_mode = v_mode,
      work_days = CASE WHEN v_mode = 'custom_days' THEN p_work_days ELSE NULL END,
      joined_on = COALESCE(p_joined_on, joined_on),
      left_on = CASE
        WHEN p_left_on IS NULL THEN left_on
        WHEN p_left_on = ''    THEN NULL
        ELSE p_left_on::date
      END
  WHERE id = p_profile_id;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.admin_update_profile_role(uuid, text, uuid, text, text, boolean, text, smallint[], date, text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.admin_update_profile_role(uuid, text, uuid, text, text, boolean, text, smallint[], date, text) TO authenticated;

-- Role names out of the database, part 2: the functions.
--
-- Eighteen functions still named roles. They fall into four kinds, and each is
-- answered differently — see the Permission Rules section of CLAUDE.md.
--
--   picking recipients   "tell every admin" → tell everyone who holds the key
--   gating an action     "only an admin may" → the permission for that action
--   ranking people       "an admin may not touch a super admin" → roles.position
--   the client boundary  a list of internal roles → is_internal_profile()
--
-- Every mapping preserves today's behaviour. Where a new key was needed it was
-- added in 20260831180000 or here, granted to exactly the roles that held the
-- ability by name.

-- ── Two helpers the rest of this needs ───────────────────────────────────────
-- has_feature() answers for the caller. Picking recipients asks about somebody
-- else, which nothing could express before — hence the role lists.
CREATE OR REPLACE FUNCTION public.profile_has_feature(p_profile uuid, p_key text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
      FROM profile_roles pr
      JOIN role_permissions rp ON rp.role_id = pr.role_id
     WHERE pr.profile_id = p_profile
       AND rp.permission_key IN (p_key, 'administrator')
  );
$$;

COMMENT ON FUNCTION public.profile_has_feature(uuid, text) IS
  'Does this person hold this permission? has_feature() asks about the caller; this asks about anyone — what "notify everyone who can approve" needs.';

-- The client/staff boundary as a fact about one row, so a query filtering to
-- staff does not have to spell out every internal role and go stale when one
-- is added.
CREATE OR REPLACE FUNCTION public.is_internal_profile(p_profile uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles p
     WHERE p.id = p_profile
       AND p.is_active
       AND p.role NOT IN ('client_owner', 'client_member')
  );
$$;

REVOKE ALL ON FUNCTION public.profile_has_feature(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.profile_has_feature(uuid, text) TO authenticated;
REVOKE ALL ON FUNCTION public.is_internal_profile(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.is_internal_profile(uuid) TO authenticated;

-- ── The exemption that kept super admins out of the audit log ───────────────
-- Hidden, like the rest of the governance plumbing: it is not something to be
-- offered in a list of abilities somebody might ask for.
INSERT INTO permissions (key, label, description, category, sort_order, is_hidden)
VALUES ('is_audit_exempt', 'Exempt from the audit log',
        'Actions by this person are not recorded in the audit log (attendance excepted).',
        'Governance', 11, true)
ON CONFLICT (key) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_key)
SELECT r.id, 'is_audit_exempt' FROM roles r WHERE r.slug = 'super_admin'
ON CONFLICT DO NOTHING;

-- ── Ranking: who may act on whom ─────────────────────────────────────────────
-- `roles.position` already models this — it is what the Roles screen reorders.
-- The old CASE was that ladder written out by hand: super_admin > admin > hr,
-- each able to act at or below its own level.
CREATE OR REPLACE FUNCTION public.my_role_rank()
RETURNS int
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(max(r.position), -1)
    FROM profile_roles pr
    JOIN roles r ON r.id = pr.role_id
   WHERE pr.profile_id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.my_role_rank() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.my_role_rank() TO authenticated;

CREATE OR REPLACE FUNCTION public.can_grant_role(p_role text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT has_feature('can_manage_people')
     AND my_role_rank() >= COALESCE((SELECT r.position FROM roles r WHERE r.slug = p_role), 2147483647);
$$;

CREATE OR REPLACE FUNCTION public.can_manage_target(p_target_role text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT has_feature('can_manage_people')
     AND my_role_rank() >= COALESCE((SELECT r.position FROM roles r WHERE r.slug = p_target_role), 2147483647);
$$;

-- ── Gating an action ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_run_monthly_reset()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT has_feature('can_govern_gamification') THEN RAISE EXCEPTION 'forbidden'; END IF;
  PERFORM fn_monthly_lp_reset();
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_profile_details(
  p_profile_id uuid, p_name text, p_avatar_url text DEFAULT NULL::text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_target_role text;
BEGIN
  IF NOT has_feature('can_edit_any_profile') THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT role INTO v_target_role FROM profiles WHERE id = p_profile_id;
  IF v_target_role IS NULL THEN RAISE EXCEPTION 'profile_not_found'; END IF;
  -- The rank ladder, not a name: you may not edit somebody who outranks you.
  IF my_role_rank() < COALESCE((SELECT r.position FROM roles r WHERE r.slug = v_target_role), 2147483647)
  THEN RAISE EXCEPTION 'forbidden_target'; END IF;
  IF p_name IS NULL OR length(trim(p_name)) = 0 THEN RAISE EXCEPTION 'name_required'; END IF;
  UPDATE profiles SET name = p_name, avatar_url = p_avatar_url WHERE id = p_profile_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.can_manage_team_templates(p_team_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  -- Whoever runs the service catalogue, the team's own lead (a fact about the
  -- team), or anyone who manages projects and is on the team.
  SELECT has_feature('can_manage_services')
      OR EXISTS (SELECT 1 FROM teams t WHERE t.id = p_team_id AND t.lead_id = auth.uid())
      OR (has_feature('can_manage_projects')
          AND EXISTS (SELECT 1 FROM team_members tm
                       WHERE tm.team_id = p_team_id AND tm.profile_id = auth.uid()));
$$;

-- ── Standups and reporting: an all-scope key and a team-scope key ────────────
CREATE OR REPLACE FUNCTION public.fn_can_report_on(p_profile uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p_profile = auth.uid()
      OR has_feature('can_view_standups')
      OR (has_feature('can_view_team_standups') AND shares_team_with(p_profile));
$$;

CREATE OR REPLACE FUNCTION public.fn_can_report_on_project(p_project uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT has_feature('can_view_standups')
      OR is_project_manager(p_project)
      OR (has_feature('can_view_team_standups') AND EXISTS (
            SELECT 1
              FROM team_members tm
              JOIN teams t             ON t.id = tm.team_id
              JOIN project_services ps ON ps.project_id = p_project
              JOIN services s          ON s.id = ps.service_id
             WHERE tm.profile_id = auth.uid()
               AND t.service_type = s.slug
         ))
      OR is_project_member(p_project);
$$;

CREATE OR REPLACE FUNCTION public.standup_roster(p_date date)
RETURNS TABLE(profile_id uuid, name text, avatar_url text, role text, standup_id uuid,
              submitted_at timestamp with time zone, is_late boolean, on_leave boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    p.id, p.name, p.avatar_url, p.role,
    st.id, st.submitted_at, st.is_late,
    EXISTS (SELECT 1 FROM attendance a
             WHERE a.profile_id = p.id AND a.date = p_date
               AND a.day_type IN ('leave', 'holiday') AND a.day_part = 'full')
  FROM profiles p
  LEFT JOIN standups st ON st.profile_id = p.id AND st.standup_date = p_date
  WHERE p.is_active
    AND fn_standup_participant(p.id)
    AND (
      has_feature('can_view_standups')
      OR (has_feature('can_view_team_standups') AND shares_team_with(p.id))
    )
  ORDER BY (st.id IS NOT NULL), p.name
$$;

-- ── The absence job: staff, expressed as the boundary rather than a list ─────
CREATE OR REPLACE FUNCTION public.fn_mark_absent_for_date(d date)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT fn_is_working_day(d) THEN RETURN; END IF;

  INSERT INTO attendance (profile_id, date, status, day_type, day_part, source)
  SELECT p.id, d, 'absent', 'work', 'full', 'system'
  FROM profiles p
  WHERE p.is_active
    AND is_internal_profile(p.id)
    AND NOT EXISTS (SELECT 1 FROM attendance a WHERE a.profile_id = p.id AND a.date = d)
  ON CONFLICT (profile_id, date) DO NOTHING;

  UPDATE attendance
  SET status = 'absent', updated_at = now()
  WHERE date = d
    AND status IS NULL
    AND check_in IS NULL
    AND day_type = 'leave'
    AND day_part <> 'full';
END;
$$;

-- ── Gamification review: finance by name becomes the payout key ─────────────
-- can_fulfill_payouts is held by finance, admin, hr and super_admin, and the
-- other half of each test is can_govern_gamification (admin, hr, super_admin),
-- so the set is unchanged.
DO $do$
DECLARE r record; v_new text;
BEGIN
  FOR r IN
    SELECT p.oid, p.proname, pg_get_functiondef(p.oid) AS def
      FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public' AND p.proname IN ('review_redemption', 'review_reward_pool')
  LOOP
    v_new := replace(r.def,
      'can_govern_gamification() OR current_user_role() = ''finance''',
      'can_govern_gamification() OR has_feature(''can_fulfill_payouts'')');
    IF v_new = r.def THEN
      RAISE EXCEPTION 'pattern not found in %, refusing to leave a role name behind', r.proname;
    END IF;
    EXECUTE v_new;
  END LOOP;
END $do$;

-- ── Audit and quest alerts: recipients chosen by permission ─────────────────
-- Patched textually rather than retyped: these bodies are hundreds of lines of
-- unrelated logic, and copying them out to change one WHERE clause is how a
-- subtle difference gets introduced. Each replacement is asserted, so a pattern
-- that stops matching fails the migration instead of silently leaving a role
-- name behind.
DO $do$
DECLARE r record; v_new text; v_before text;
BEGIN
  FOR r IN
    SELECT p.oid, p.proname, pg_get_functiondef(p.oid) AS def
      FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.proname IN ('fn_audit_capture', 'fn_audit_channel_delete', 'fn_audit_impersonation',
                         'fn_audit_message_delete', 'fn_audit_standup', 'fn_notify_quest_claimed')
  LOOP
    v_before := r.def;
    v_new := r.def;

    -- "tell every admin" → tell everyone who can read the audit log
    v_new := regexp_replace(v_new,
      'p\.is_active AND p\.role IN \(''super_admin'',\s*''admin''\)',
      'p.is_active AND profile_has_feature(p.id, ''can_view_audit_log'')', 'g');

    -- the quest alert goes to whoever governs gamification
    v_new := regexp_replace(v_new,
      'p\.is_active AND p\.role IN \(''super_admin'',''admin'',''hr''\)',
      'p.is_active AND profile_has_feature(p.id, ''can_govern_gamification'')', 'g');

    -- and the audit log's own exemption stops being a role
    v_new := replace(v_new,
      'EXISTS (SELECT 1 FROM profiles p WHERE p.id = v_auth AND p.role = ''super_admin'')',
      'profile_has_feature(v_auth, ''is_audit_exempt'')');

    IF v_new = v_before THEN
      RAISE EXCEPTION 'no pattern matched in %, refusing to leave a role name behind', r.proname;
    END IF;
    EXECUTE v_new;
  END LOOP;
END $do$;

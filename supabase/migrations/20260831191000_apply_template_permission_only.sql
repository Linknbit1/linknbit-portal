-- The last role name in a database rule.
--
-- apply_template_to_service listed three roles beside a can_manage_projects
-- check that already covered all of them plus team_lead, so the names were
-- doing nothing but making the rule look like it depended on them.
--
-- Also documents the one deliberate survivor: p_profiles_self_update's
-- `role = current_user_role()` is not a gate. It is the check that stops you
-- editing your own role, and the column being guarded happens to be the role.

DO $do$
DECLARE v_def text; v_new text;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO v_def
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'apply_template_to_service';

  v_new := replace(v_def,
    E'            current_user_role() IN (\'super_admin\', \'admin\', \'project_manager\')\n            OR has_feature(\'can_manage_projects\')',
    E'            has_feature(\'can_manage_projects\')');

  IF v_new = v_def THEN
    RAISE EXCEPTION 'pattern not found in apply_template_to_service';
  END IF;
  EXECUTE v_new;
END $do$;

COMMENT ON POLICY p_profiles_self_update ON profiles IS
  'Not a permission gate: `role = current_user_role()` is the check that stops you editing your own role. The column being guarded happens to be the role itself, which no permission could express.';

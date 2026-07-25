-- ════════════════════════════════════════════════════════════════════
-- AUDIT LOG — Part 4 of 4: projects module triggers + impersonation.
--
-- projects/tasks/clients carry soft-delete; their UPDATE trigger recognises the
-- deleted_at flip as a delete. Their operational children (comments, subtasks,
-- attachments) are HARD-deleted inside delete_task_cascade/delete_project_cascade,
-- so a DELETE-only trigger there preserves history the cascade otherwise erases.
--
-- impersonation_log was referenced by the auth-impersonate Edge Function but never
-- migrated. This formalises it and routes it into the audit trail as the `access`
-- module, so "admin logged in as member" is a first-class flagged event.
-- ════════════════════════════════════════════════════════════════════

CREATE TRIGGER trg_audit_projects
  AFTER INSERT OR UPDATE OR DELETE ON projects
  FOR EACH ROW EXECUTE FUNCTION fn_audit_capture('projects');

CREATE TRIGGER trg_audit_tasks
  AFTER INSERT OR UPDATE OR DELETE ON tasks
  FOR EACH ROW EXECUTE FUNCTION fn_audit_capture('projects');

CREATE TRIGGER trg_audit_clients
  AFTER INSERT OR UPDATE OR DELETE ON clients
  FOR EACH ROW EXECUTE FUNCTION fn_audit_capture('projects');

CREATE TRIGGER trg_audit_approvals
  AFTER INSERT OR UPDATE ON approvals
  FOR EACH ROW EXECUTE FUNCTION fn_audit_capture('projects');

CREATE TRIGGER trg_audit_comments
  AFTER DELETE ON comments
  FOR EACH ROW EXECUTE FUNCTION fn_audit_capture('projects');

CREATE TRIGGER trg_audit_subtasks
  AFTER DELETE ON subtasks
  FOR EACH ROW EXECUTE FUNCTION fn_audit_capture('projects');

CREATE TRIGGER trg_audit_attachments
  AFTER DELETE ON attachments
  FOR EACH ROW EXECUTE FUNCTION fn_audit_capture('projects');

CREATE TRIGGER trg_audit_project_members
  AFTER INSERT OR DELETE ON project_members
  FOR EACH ROW EXECUTE FUNCTION fn_audit_capture('projects');

CREATE TRIGGER trg_audit_task_assignees
  AFTER INSERT OR DELETE ON task_assignees
  FOR EACH ROW EXECUTE FUNCTION fn_audit_capture('projects');

-- ── Formalise impersonation_log + audit it as the `access` module ───────────────
CREATE TABLE IF NOT EXISTS impersonation_log (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id   uuid        NOT NULL REFERENCES profiles(id),
  target_id  uuid        NOT NULL REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE impersonation_log ENABLE ROW LEVEL SECURITY;
-- Written only by the service-role Edge Function; visible only to audit viewers.
GRANT SELECT ON impersonation_log TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON impersonation_log FROM authenticated, anon;
DROP POLICY IF EXISTS p_impersonation_admin_select ON impersonation_log;
CREATE POLICY p_impersonation_admin_select ON impersonation_log FOR SELECT
  USING (has_feature('can_view_audit_log'));

-- Dedicated describe: impersonation_log has admin_id (actor) / target_id (subject)
-- rather than the generic columns, and it is always worth flagging.
CREATE OR REPLACE FUNCTION fn_audit_impersonation()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_actor_name text; v_actor_role text; v_subject_name text;
BEGIN
  SELECT name, role INTO v_actor_name, v_actor_role FROM profiles WHERE id = NEW.admin_id;
  SELECT name INTO v_subject_name FROM profiles WHERE id = NEW.target_id;

  INSERT INTO audit_log(
    module, table_name, record_id, operation, action, severity,
    actor_id, actor_name, actor_role, actor_kind,
    subject_id, subject_name, summary,
    old_values, new_values, flagged, flag_reason)
  VALUES (
    'access', 'impersonation_log', NEW.id, 'INSERT', 'access.impersonation_started', 'danger',
    NEW.admin_id, COALESCE(v_actor_name,'Unknown'), COALESCE(v_actor_role,'unknown'), 'user',
    NEW.target_id, v_subject_name,
    format('%s (%s): logged in as %s', COALESCE(v_actor_name,'Unknown'), COALESCE(v_actor_role,'unknown'), COALESCE(v_subject_name,'a member')),
    NULL, to_jsonb(NEW), true,
    'Admin started an impersonation session (logged in as another member).');

  PERFORM fn_notify(
    p.id, 'audit_alert', 'Impersonation started',
    format('%s logged in as %s', COALESCE(v_actor_name,'Unknown'), COALESCE(v_subject_name,'a member')),
    'audit_alert', NEW.id::text, NEW.admin_id)
  FROM profiles p
  WHERE p.is_active AND p.role IN ('super_admin','admin');

  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_audit_impersonation
  AFTER INSERT ON impersonation_log
  FOR EACH ROW EXECUTE FUNCTION fn_audit_impersonation();

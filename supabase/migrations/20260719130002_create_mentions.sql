-- @mentions inside comments / task descriptions / project docs. The app inserts a
-- row per mentioned person (excluding the author); an AFTER INSERT trigger notifies
-- them via fn_notify (which also fires web push). project_id scopes RLS.
CREATE TABLE mentions (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type text        NOT NULL CHECK (source_type IN ('comment', 'task', 'project')),
  source_id   uuid        NOT NULL,
  project_id  uuid        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  profile_id  uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_by  uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_mentions_source  ON mentions (source_type, source_id);
CREATE INDEX idx_mentions_profile ON mentions (profile_id);

ALTER TABLE mentions ENABLE ROW LEVEL SECURITY;

CREATE POLICY p_mentions_select ON mentions FOR SELECT
  USING (
    profile_id = auth.uid()
    OR (
      is_internal()
      AND (current_user_role() IN ('super_admin', 'admin', 'project_manager', 'finance') OR is_project_member(project_id))
    )
  );

CREATE POLICY p_mentions_insert ON mentions FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND is_internal()
    AND (current_user_role() IN ('super_admin', 'admin', 'project_manager') OR is_project_member(project_id))
  );

CREATE OR REPLACE FUNCTION fn_notify_mention() RETURNS trigger AS $$
DECLARE v_actor text;
BEGIN
  SELECT name INTO v_actor FROM profiles WHERE id = NEW.created_by;
  PERFORM fn_notify(
    NEW.profile_id,
    'mention',
    'You were mentioned',
    COALESCE(v_actor, 'Someone') || ' mentioned you in a ' || NEW.source_type,
    NEW.source_type,
    NEW.source_id::text,
    NEW.created_by
  );
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_notify_mention AFTER INSERT ON mentions
  FOR EACH ROW EXECUTE FUNCTION fn_notify_mention();

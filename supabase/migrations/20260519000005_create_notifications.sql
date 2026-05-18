-- In-app notifications — inserted only by SECURITY DEFINER functions, never via user RLS INSERT.
CREATE TABLE notifications (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id    uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title         text        NOT NULL,
  body          text,
  resource_type text,
  resource_id   text,
  read          boolean     NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_profile ON notifications(profile_id, read, created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY p_notifications_select ON notifications FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY p_notifications_update ON notifications FOR UPDATE
  USING     (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

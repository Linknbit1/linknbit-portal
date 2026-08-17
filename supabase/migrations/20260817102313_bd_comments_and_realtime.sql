-- Business Development, part 3: discussion on the records, live.
--
-- ── Why not reuse `comments` and `mentions` ──────────────────────────────────
--
-- Both are hard-wired to delivery. `comments.task_id` references tasks(id), and
-- `mentions.project_id` is a NOT NULL FK to projects(id) that its RLS reads
-- through is_project_member(). A BD lead has no delivery project, so there is no
-- value that column could hold — and widening it would mean loosening the
-- policies that protect every existing comment in the portal.
--
-- So BD gets its own pair, shaped the same way (content + doc, mention rows that
-- notify on insert) but scoped by can_view_bd instead of project membership. The
-- client-side code is genuinely shared: the same RichEditor, the same
-- ProseMirror document, the same @-mention flow.
--
-- ── Why three nullable FKs instead of (entity_type, entity_id) ───────────────
--
-- A polymorphic pair cannot carry a foreign key, so deleting a lead would strand
-- its thread and a Realtime subscription would have to filter on two columns.
-- Three columns with a CHECK that exactly one is set keeps ON DELETE CASCADE
-- honest and lets a subscriber filter on `lead_id=eq.<id>` directly.

CREATE TABLE bd_comments (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id    uuid        REFERENCES bd_tasks(id)    ON DELETE CASCADE,
  lead_id    uuid        REFERENCES bd_leads(id)    ON DELETE CASCADE,
  project_id uuid        REFERENCES bd_projects(id) ON DELETE CASCADE,
  -- Plain-text mirror of `doc`. Notifications, search and previews cannot read
  -- ProseMirror JSON, and a comment posted before rich text existed has only this.
  content    text        NOT NULL DEFAULT '',
  doc        jsonb,
  author_id  uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bd_comments_one_parent CHECK (
    (task_id IS NOT NULL)::int + (lead_id IS NOT NULL)::int + (project_id IS NOT NULL)::int = 1
  )
);

CREATE INDEX idx_bd_comments_task    ON bd_comments (task_id, created_at);
CREATE INDEX idx_bd_comments_lead    ON bd_comments (lead_id, created_at);
CREATE INDEX idx_bd_comments_project ON bd_comments (project_id, created_at);

CREATE TRIGGER trg_bd_comments_touch BEFORE UPDATE ON bd_comments
  FOR EACH ROW EXECUTE FUNCTION fn_bd_touch_updated_at();

ALTER TABLE bd_comments ENABLE ROW LEVEL SECURITY;

-- You may always edit and delete your own comment. A manager may delete anyone's
-- (moderation) but may NOT edit it — putting words in someone's mouth is not a
-- moderation power.
CREATE POLICY p_bd_comments_select ON bd_comments FOR SELECT USING (bd_can_view());
CREATE POLICY p_bd_comments_insert ON bd_comments FOR INSERT
  WITH CHECK (bd_can_view() AND author_id = auth.uid());
CREATE POLICY p_bd_comments_update ON bd_comments FOR UPDATE
  USING (author_id = auth.uid()) WITH CHECK (author_id = auth.uid());
CREATE POLICY p_bd_comments_delete ON bd_comments FOR DELETE
  USING (author_id = auth.uid() OR bd_can_manage());

-- ═══ Mentions ════════════════════════════════════════════════════════════════
--
-- One row per person tagged on a source, deduped by the unique key. The app
-- re-sends the full mention set on every autosave, so the constraint is what
-- makes that idempotent: only a genuinely new tag inserts, and only an insert
-- notifies. Tagging someone, deleting the tag and re-adding it therefore pings
-- them once — which is the behaviour you want.

CREATE TABLE bd_mentions (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type text        NOT NULL CHECK (source_type IN ('bd_comment','bd_task','bd_lead','bd_project')),
  source_id   uuid        NOT NULL,
  profile_id  uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_by  uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_type, source_id, profile_id)
);

CREATE INDEX idx_bd_mentions_profile ON bd_mentions (profile_id);

ALTER TABLE bd_mentions ENABLE ROW LEVEL SECURITY;

-- A tagged person reads their own mention rows even without can_view_bd: that is
-- what makes the notification resolvable when they click it.
CREATE POLICY p_bd_mentions_select ON bd_mentions FOR SELECT
  USING (profile_id = auth.uid() OR bd_can_view());
CREATE POLICY p_bd_mentions_insert ON bd_mentions FOR INSERT
  WITH CHECK (bd_can_view() AND created_by = auth.uid());
CREATE POLICY p_bd_mentions_delete ON bd_mentions FOR DELETE
  USING (created_by = auth.uid() OR bd_can_manage());

CREATE OR REPLACE FUNCTION fn_bd_notify_mention() RETURNS trigger AS $$
DECLARE
  v_actor text;
  v_where text;
BEGIN
  SELECT name INTO v_actor FROM profiles WHERE id = NEW.created_by;
  v_where := CASE NEW.source_type
    WHEN 'bd_comment' THEN 'a BD comment'
    WHEN 'bd_task'    THEN 'a BD task'
    WHEN 'bd_lead'    THEN 'a lead'
    ELSE 'a BD campaign'
  END;
  PERFORM fn_notify(
    NEW.profile_id, 'mention', 'You were mentioned',
    COALESCE(v_actor, 'Someone') || ' mentioned you in ' || v_where,
    NEW.source_type, NEW.source_id::text, NEW.created_by
  );
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_bd_notify_mention AFTER INSERT ON bd_mentions
  FOR EACH ROW EXECUTE FUNCTION fn_bd_notify_mention();

-- ═══ Realtime ════════════════════════════════════════════════════════════════
--
-- The publication is table-wide because that is the only granularity Postgres
-- offers; each subscriber still receives only rows RLS lets them SELECT, further
-- narrowed by the per-subscription filter the client sets.
--
-- Comments are the one surface where "someone else is typing into this record
-- right now" is the normal case, so they lead. Leads and tasks are here because
-- the pipeline and the board are shared screens — a card that moves under
-- someone else's cursor should move on your screen too, not on your next reload.
--
-- Guarded: adding a table already in the publication raises.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['bd_comments','bd_tasks','bd_leads','bd_activities','bd_projects','bd_task_checklist']
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END
$$;

-- Realtime sends the OLD row on UPDATE/DELETE only when the table has a replica
-- identity covering it. Without this a card removed from the board on one screen
-- lingers on every other one, because the delete payload arrives with no id.
ALTER TABLE bd_comments       REPLICA IDENTITY FULL;
ALTER TABLE bd_tasks          REPLICA IDENTITY FULL;
ALTER TABLE bd_leads          REPLICA IDENTITY FULL;
ALTER TABLE bd_activities     REPLICA IDENTITY FULL;
ALTER TABLE bd_projects       REPLICA IDENTITY FULL;
ALTER TABLE bd_task_checklist REPLICA IDENTITY FULL;

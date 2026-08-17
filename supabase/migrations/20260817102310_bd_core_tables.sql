-- Business Development, part 2: the records themselves.
--
-- Until now the whole module ran off src/data/bdMock.ts held in a React context —
-- every edit lived for one session and was invisible to the next person. These
-- tables replace that store; part 1 (20260811090000) already shipped the two
-- capabilities this file's policies read.
--
-- ── The access model ─────────────────────────────────────────────────────────
--
-- Deliberately NOT the delivery model. A delivery project scopes access by
-- membership (is_project_member); a sales pipeline cannot work that way, because
-- a rep has to see the department's channel performance and the shared board to
-- do the job at all. So:
--
--   can_view_bd    → read everything in the module. Reps compare against each
--                    other's numbers; hiding rows would break every report.
--   can_manage_bd  → write anything (reassign leads, set targets, delete).
--   ownership      → a rep writes their own rows without can_manage_bd:
--                    their leads, their activities, their tasks, their updates.
--
-- Read is intentionally broader than write. That is the whole shape of it.
--
-- ── Why enums are CHECK constraints, not Postgres enums ──────────────────────
-- Same call the rest of this schema makes (tasks.status, projects.status): a new
-- stage or channel is one ALTER, and the generated TypeScript union comes out
-- identical either way.

-- ═══ Leads ═══════════════════════════════════════════════════════════════════

CREATE TABLE bd_leads (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  company        text        NOT NULL,
  contact_name   text        NOT NULL DEFAULT '',
  contact_title  text        NOT NULL DEFAULT '',
  email          text        NOT NULL DEFAULT '',
  phone          text        NOT NULL DEFAULT '',
  channel        text        NOT NULL DEFAULT 'inbound'
                             CHECK (channel IN ('upwork','fiverr','linkedin','email','cold_call','inbound','referral')),
  -- Finer-grained than delivery's three services: a prospect asks for "webflow"
  -- or "seo", and forcing that into design/development/marketing at capture time
  -- loses the only detail that makes the lead qualifiable.
  services       text[]      NOT NULL DEFAULT '{}',
  industry       text        NOT NULL DEFAULT '',
  icp_fit        text        NOT NULL DEFAULT 'partial' CHECK (icp_fit IN ('strong','partial','none')),
  value          numeric     NOT NULL DEFAULT 0,
  stage          text        NOT NULL DEFAULT 'new'
                             CHECK (stage IN ('new','contacted','qualified','meeting','proposal_sent','negotiation','won','lost','unqualified')),
  temperature    text        NOT NULL DEFAULT 'warm' CHECK (temperature IN ('hot','warm','cold')),
  owner_id       uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  added_on       date        NOT NULL DEFAULT current_date,
  last_contacted date,
  next_follow_up date,
  -- Only meaningful at stage = 'lost'; cleared when a lead is reopened.
  lost_reason    text,
  -- Rich notes on the prospect, same ProseMirror document the delivery project
  -- description uses. `description` is its plain-text mirror, for card excerpts
  -- and anything that cannot read ProseMirror JSON.
  doc            jsonb,
  description    text,
  created_by     uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_bd_leads_stage   ON bd_leads (stage);
CREATE INDEX idx_bd_leads_owner   ON bd_leads (owner_id);
CREATE INDEX idx_bd_leads_channel ON bd_leads (channel);

-- ═══ Projects (outreach campaigns) ═══════════════════════════════════════════

CREATE TABLE bd_projects (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text        NOT NULL,
  description text,
  doc         jsonb,
  owner_id    uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  status      text        NOT NULL DEFAULT 'in_progress'
                          CHECK (status IN ('in_progress','ongoing','awaiting_client','blocked','on_hold','completed')),
  deadline    date,
  -- A campaign targets channels the way a delivery project targets services.
  channels    text[]      NOT NULL DEFAULT '{}',
  created_by  uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE bd_project_members (
  project_id uuid NOT NULL REFERENCES bd_projects(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES profiles(id)    ON DELETE CASCADE,
  PRIMARY KEY (project_id, profile_id)
);

CREATE INDEX idx_bd_project_members_profile ON bd_project_members (profile_id);

-- ═══ Tasks ═══════════════════════════════════════════════════════════════════

CREATE TABLE bd_tasks (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text        NOT NULL,
  description text,
  doc         jsonb,
  project_id  uuid        NOT NULL REFERENCES bd_projects(id) ON DELETE CASCADE,
  assignee_id uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  -- The delivery board's statuses minus 'backlog'. BD work is queued or it is
  -- not; there is no parking lot.
  status      text        NOT NULL DEFAULT 'todo'
                          CHECK (status IN ('todo','in_progress','review','approved','completed','blocked')),
  priority    text        NOT NULL DEFAULT 'medium' CHECK (priority IN ('critical','high','medium','low')),
  due_date    date,
  lead_id     uuid        REFERENCES bd_leads(id) ON DELETE SET NULL,
  channel     text        CHECK (channel IN ('upwork','fiverr','linkedin','email','cold_call','inbound','referral')),
  recurrence  text        NOT NULL DEFAULT 'once' CHECK (recurrence IN ('once','daily','weekly','monthly')),
  -- Board order within a lane. Fractional on purpose: dropping a card between
  -- two others writes the midpoint of its neighbours, so a reorder is one UPDATE
  -- of one row rather than a renumber of the column.
  position    double precision NOT NULL DEFAULT 0,
  created_by  uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_bd_tasks_project  ON bd_tasks (project_id);
CREATE INDEX idx_bd_tasks_assignee ON bd_tasks (assignee_id);
CREATE INDEX idx_bd_tasks_board    ON bd_tasks (status, position);

CREATE TABLE bd_task_checklist (
  id       uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id  uuid    NOT NULL REFERENCES bd_tasks(id) ON DELETE CASCADE,
  label    text    NOT NULL,
  done     boolean NOT NULL DEFAULT false,
  position double precision NOT NULL DEFAULT 0
);

CREATE INDEX idx_bd_task_checklist_task ON bd_task_checklist (task_id, position);

-- ═══ Activities ══════════════════════════════════════════════════════════════
-- One unit of BD effort. A touchpoint on a named prospect and a batch of cold
-- outreach are the SAME record with different shapes:
--   a call on Nordic Freight → lead_id set,  volume 1
--   20 Upwork proposals      → lead_id null, volume 20
-- That is why the Outreach page and a lead's own log can never disagree: they
-- are two filters over this one table.

CREATE TABLE bd_activities (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id        uuid        REFERENCES bd_leads(id) ON DELETE CASCADE,
  channel        text        NOT NULL
                             CHECK (channel IN ('upwork','fiverr','linkedin','email','cold_call','inbound','referral')),
  type           text        NOT NULL DEFAULT 'note'
                             CHECK (type IN ('call','email','linkedin','meeting','proposal','note','stage_change')),
  occurred_at    timestamptz NOT NULL DEFAULT now(),
  outcome        text        CHECK (outcome IN ('connected','no_response','follow_up','meeting_booked','not_interested')),
  note           text        NOT NULL DEFAULT '',
  volume         integer     NOT NULL DEFAULT 1,
  responses      integer     NOT NULL DEFAULT 0,
  meetings_booked integer    NOT NULL DEFAULT 0,
  leads_created  integer     NOT NULL DEFAULT 0,
  by_id          uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_bd_activities_lead    ON bd_activities (lead_id);
CREATE INDEX idx_bd_activities_channel ON bd_activities (channel, occurred_at DESC);
CREATE INDEX idx_bd_activities_by      ON bd_activities (by_id);

-- ═══ Meetings ════════════════════════════════════════════════════════════════

CREATE TABLE bd_meetings (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id          uuid        REFERENCES bd_leads(id) ON DELETE CASCADE,
  scheduled_at     timestamptz NOT NULL,
  duration_minutes integer     NOT NULL DEFAULT 30,
  type             text        NOT NULL DEFAULT 'discovery'
                               CHECK (type IN ('discovery','proposal','negotiation','kickoff','other')),
  host_id          uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  client_attendees text        NOT NULL DEFAULT '',
  platform         text        NOT NULL DEFAULT 'meet' CHECK (platform IN ('zoom','meet','phone','in_person')),
  -- Both absent until the meeting has happened.
  outcome          text,
  next_step        text,
  created_by       uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_bd_meetings_lead ON bd_meetings (lead_id);
CREATE INDEX idx_bd_meetings_when ON bd_meetings (scheduled_at);

-- Portal staff invited to the meeting. Real profile ids, so an invitee can be
-- shown their own schedule outside the BD module — they cannot open /bd/*.
CREATE TABLE bd_meeting_attendees (
  meeting_id uuid NOT NULL REFERENCES bd_meetings(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES profiles(id)    ON DELETE CASCADE,
  PRIMARY KEY (meeting_id, profile_id)
);

CREATE INDEX idx_bd_meeting_attendees_profile ON bd_meeting_attendees (profile_id);

-- ═══ Daily updates ═══════════════════════════════════════════════════════════
-- One row per rep per day, hence the unique key: a check-in is amended, never
-- duplicated.

CREATE TABLE bd_daily_updates (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  rep_id         uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  update_date    date        NOT NULL DEFAULT current_date,
  submitted_at   timestamptz,
  platforms      text[]      NOT NULL DEFAULT '{}',
  summary        text        NOT NULL DEFAULT '',
  proposals_sent integer     NOT NULL DEFAULT 0,
  calls_made     integer     NOT NULL DEFAULT 0,
  meetings_held  integer     NOT NULL DEFAULT 0,
  leads_added    integer     NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (rep_id, update_date)
);

CREATE INDEX idx_bd_daily_updates_date ON bd_daily_updates (update_date DESC);

-- ═══ Targets ═════════════════════════════════════════════════════════════════
-- Only the quota is stored. Attainment is computed from closed-won leads,
-- activities and meetings at read time — a stored actual is a number that goes
-- stale the moment someone edits the pipeline.

CREATE TABLE bd_targets (
  id              uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  rep_id          uuid    NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  -- First day of the month the quota covers.
  period_month    date    NOT NULL,
  revenue_target  numeric NOT NULL DEFAULT 0,
  outreach_target integer NOT NULL DEFAULT 0,
  meetings_target integer NOT NULL DEFAULT 0,
  updated_by      uuid    REFERENCES profiles(id) ON DELETE SET NULL,
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (rep_id, period_month)
);

-- ═══ Handoffs ════════════════════════════════════════════════════════════════
-- A won lead passed to delivery. Recorded on the BD side so the lead stays in BD
-- history and stays linked to what it became (SRS §3.6).

CREATE TABLE bd_handoffs (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id      uuid        NOT NULL REFERENCES bd_leads(id) ON DELETE CASCADE,
  -- The delivery service the lead's finer-grained BD services were mapped down to.
  service_slug text        NOT NULL,
  project_name text        NOT NULL,
  budget       numeric     NOT NULL DEFAULT 0,
  manager_id   uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  notes        text,
  -- Set once the handoff has produced a real delivery project.
  project_id   uuid        REFERENCES projects(id) ON DELETE SET NULL,
  handed_at    timestamptz NOT NULL DEFAULT now(),
  by_id        uuid        REFERENCES profiles(id) ON DELETE SET NULL
);

CREATE INDEX idx_bd_handoffs_lead ON bd_handoffs (lead_id);

-- ── updated_at ───────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION fn_bd_touch_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_bd_leads_touch         BEFORE UPDATE ON bd_leads         FOR EACH ROW EXECUTE FUNCTION fn_bd_touch_updated_at();
CREATE TRIGGER trg_bd_projects_touch      BEFORE UPDATE ON bd_projects      FOR EACH ROW EXECUTE FUNCTION fn_bd_touch_updated_at();
CREATE TRIGGER trg_bd_tasks_touch         BEFORE UPDATE ON bd_tasks         FOR EACH ROW EXECUTE FUNCTION fn_bd_touch_updated_at();
CREATE TRIGGER trg_bd_meetings_touch      BEFORE UPDATE ON bd_meetings      FOR EACH ROW EXECUTE FUNCTION fn_bd_touch_updated_at();
CREATE TRIGGER trg_bd_daily_updates_touch BEFORE UPDATE ON bd_daily_updates FOR EACH ROW EXECUTE FUNCTION fn_bd_touch_updated_at();
CREATE TRIGGER trg_bd_targets_touch       BEFORE UPDATE ON bd_targets       FOR EACH ROW EXECUTE FUNCTION fn_bd_touch_updated_at();

-- ═══ RLS ═════════════════════════════════════════════════════════════════════
--
-- has_feature() already answers 'administrator' and already excludes deactivated
-- people (20260807120000), so neither needs repeating in a policy.

-- Can the caller open the module at all?
CREATE OR REPLACE FUNCTION bd_can_view() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT has_feature('can_view_bd');
$$;

-- Can the caller edit the department's records, not just their own?
CREATE OR REPLACE FUNCTION bd_can_manage() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT has_feature('can_manage_bd');
$$;

ALTER TABLE bd_leads             ENABLE ROW LEVEL SECURITY;
ALTER TABLE bd_projects          ENABLE ROW LEVEL SECURITY;
ALTER TABLE bd_project_members   ENABLE ROW LEVEL SECURITY;
ALTER TABLE bd_tasks             ENABLE ROW LEVEL SECURITY;
ALTER TABLE bd_task_checklist    ENABLE ROW LEVEL SECURITY;
ALTER TABLE bd_activities        ENABLE ROW LEVEL SECURITY;
ALTER TABLE bd_meetings          ENABLE ROW LEVEL SECURITY;
ALTER TABLE bd_meeting_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE bd_daily_updates     ENABLE ROW LEVEL SECURITY;
ALTER TABLE bd_targets           ENABLE ROW LEVEL SECURITY;
ALTER TABLE bd_handoffs          ENABLE ROW LEVEL SECURITY;

-- ── Leads: owner writes their own, manager writes anything ───────────────────
CREATE POLICY p_bd_leads_select ON bd_leads FOR SELECT USING (bd_can_view());
CREATE POLICY p_bd_leads_insert ON bd_leads FOR INSERT
  WITH CHECK (bd_can_view() AND (bd_can_manage() OR owner_id = auth.uid()));
CREATE POLICY p_bd_leads_update ON bd_leads FOR UPDATE
  USING (bd_can_manage() OR owner_id = auth.uid())
  WITH CHECK (bd_can_manage() OR owner_id = auth.uid());
CREATE POLICY p_bd_leads_delete ON bd_leads FOR DELETE
  USING (bd_can_manage() OR owner_id = auth.uid());

-- ── Projects: campaigns are shared, so only a manager or the owner restructures one ──
CREATE POLICY p_bd_projects_select ON bd_projects FOR SELECT USING (bd_can_view());
CREATE POLICY p_bd_projects_insert ON bd_projects FOR INSERT
  WITH CHECK (bd_can_view() AND (bd_can_manage() OR owner_id = auth.uid()));
CREATE POLICY p_bd_projects_update ON bd_projects FOR UPDATE
  USING (bd_can_manage() OR owner_id = auth.uid())
  WITH CHECK (bd_can_manage() OR owner_id = auth.uid());
CREATE POLICY p_bd_projects_delete ON bd_projects FOR DELETE
  USING (bd_can_manage() OR owner_id = auth.uid());

CREATE POLICY p_bd_project_members_select ON bd_project_members FOR SELECT USING (bd_can_view());
CREATE POLICY p_bd_project_members_write  ON bd_project_members FOR ALL
  USING (bd_can_manage() OR EXISTS (SELECT 1 FROM bd_projects p WHERE p.id = project_id AND p.owner_id = auth.uid()))
  WITH CHECK (bd_can_manage() OR EXISTS (SELECT 1 FROM bd_projects p WHERE p.id = project_id AND p.owner_id = auth.uid()));

-- ── Tasks: the assignee owns their card ──────────────────────────────────────
-- Anyone in BD may create a task (that is how a board is used); after that only
-- the assignee, the person who created it, or a manager may change it.
CREATE POLICY p_bd_tasks_select ON bd_tasks FOR SELECT USING (bd_can_view());
CREATE POLICY p_bd_tasks_insert ON bd_tasks FOR INSERT WITH CHECK (bd_can_view());
CREATE POLICY p_bd_tasks_update ON bd_tasks FOR UPDATE
  USING (bd_can_manage() OR assignee_id = auth.uid() OR created_by = auth.uid())
  WITH CHECK (bd_can_manage() OR assignee_id = auth.uid() OR created_by = auth.uid());
CREATE POLICY p_bd_tasks_delete ON bd_tasks FOR DELETE
  USING (bd_can_manage() OR created_by = auth.uid());

CREATE POLICY p_bd_task_checklist_select ON bd_task_checklist FOR SELECT USING (bd_can_view());
CREATE POLICY p_bd_task_checklist_write  ON bd_task_checklist FOR ALL
  USING (
    bd_can_manage()
    OR EXISTS (SELECT 1 FROM bd_tasks t WHERE t.id = task_id AND (t.assignee_id = auth.uid() OR t.created_by = auth.uid()))
  )
  WITH CHECK (
    bd_can_manage()
    OR EXISTS (SELECT 1 FROM bd_tasks t WHERE t.id = task_id AND (t.assignee_id = auth.uid() OR t.created_by = auth.uid()))
  );

-- ── Activities: an append-only log of what you did ───────────────────────────
-- You log your own effort and may correct it; rewriting someone else's numbers
-- needs can_manage_bd, because these rows are what targets are measured against.
CREATE POLICY p_bd_activities_select ON bd_activities FOR SELECT USING (bd_can_view());
CREATE POLICY p_bd_activities_insert ON bd_activities FOR INSERT
  WITH CHECK (bd_can_view() AND (bd_can_manage() OR by_id = auth.uid()));
CREATE POLICY p_bd_activities_update ON bd_activities FOR UPDATE
  USING (bd_can_manage() OR by_id = auth.uid())
  WITH CHECK (bd_can_manage() OR by_id = auth.uid());
CREATE POLICY p_bd_activities_delete ON bd_activities FOR DELETE
  USING (bd_can_manage() OR by_id = auth.uid());

-- ── Meetings ─────────────────────────────────────────────────────────────────
CREATE POLICY p_bd_meetings_select ON bd_meetings FOR SELECT USING (bd_can_view());
CREATE POLICY p_bd_meetings_insert ON bd_meetings FOR INSERT
  WITH CHECK (bd_can_view() AND (bd_can_manage() OR host_id = auth.uid() OR created_by = auth.uid()));
CREATE POLICY p_bd_meetings_update ON bd_meetings FOR UPDATE
  USING (bd_can_manage() OR host_id = auth.uid() OR created_by = auth.uid())
  WITH CHECK (bd_can_manage() OR host_id = auth.uid() OR created_by = auth.uid());
CREATE POLICY p_bd_meetings_delete ON bd_meetings FOR DELETE
  USING (bd_can_manage() OR host_id = auth.uid() OR created_by = auth.uid());

-- An invitee reads the meeting they were invited to even without can_view_bd —
-- that is what puts a BD call on a delivery PM's own schedule.
CREATE POLICY p_bd_meeting_attendees_select ON bd_meeting_attendees FOR SELECT
  USING (bd_can_view() OR profile_id = auth.uid());
CREATE POLICY p_bd_meeting_attendees_write ON bd_meeting_attendees FOR ALL
  USING (
    bd_can_manage()
    OR EXISTS (SELECT 1 FROM bd_meetings m WHERE m.id = meeting_id AND (m.host_id = auth.uid() OR m.created_by = auth.uid()))
  )
  WITH CHECK (
    bd_can_manage()
    OR EXISTS (SELECT 1 FROM bd_meetings m WHERE m.id = meeting_id AND (m.host_id = auth.uid() OR m.created_by = auth.uid()))
  );

-- ── Daily updates: yours to write, everyone's to read ────────────────────────
CREATE POLICY p_bd_daily_updates_select ON bd_daily_updates FOR SELECT USING (bd_can_view());
CREATE POLICY p_bd_daily_updates_insert ON bd_daily_updates FOR INSERT
  WITH CHECK (bd_can_view() AND (bd_can_manage() OR rep_id = auth.uid()));
CREATE POLICY p_bd_daily_updates_update ON bd_daily_updates FOR UPDATE
  USING (bd_can_manage() OR rep_id = auth.uid())
  WITH CHECK (bd_can_manage() OR rep_id = auth.uid());
CREATE POLICY p_bd_daily_updates_delete ON bd_daily_updates FOR DELETE
  USING (bd_can_manage() OR rep_id = auth.uid());

-- ── Targets: read by everyone in BD, set only by a manager ───────────────────
-- Nobody sets their own quota.
CREATE POLICY p_bd_targets_select ON bd_targets FOR SELECT USING (bd_can_view());
CREATE POLICY p_bd_targets_write  ON bd_targets FOR ALL
  USING (bd_can_manage()) WITH CHECK (bd_can_manage());

-- ── Handoffs: a lead leaving BD is a department-level act ────────────────────
CREATE POLICY p_bd_handoffs_select ON bd_handoffs FOR SELECT USING (bd_can_view());
CREATE POLICY p_bd_handoffs_insert ON bd_handoffs FOR INSERT
  WITH CHECK (bd_can_view() AND (bd_can_manage() OR EXISTS (SELECT 1 FROM bd_leads l WHERE l.id = lead_id AND l.owner_id = auth.uid())));
CREATE POLICY p_bd_handoffs_update ON bd_handoffs FOR UPDATE
  USING (bd_can_manage()) WITH CHECK (bd_can_manage());
CREATE POLICY p_bd_handoffs_delete ON bd_handoffs FOR DELETE USING (bd_can_manage());

-- ── Notifications ────────────────────────────────────────────────────────────
-- Being handed a lead or a task is how BD work reaches someone, so it pings the
-- same way an assignment does elsewhere. Reassignment only — the initial insert
-- is the assigner's own action and is already on their screen.

CREATE OR REPLACE FUNCTION fn_bd_notify_task_assignee() RETURNS trigger AS $$
DECLARE v_actor text;
BEGIN
  IF NEW.assignee_id IS NULL OR NEW.assignee_id IS NOT DISTINCT FROM OLD.assignee_id THEN
    RETURN NULL;
  END IF;
  SELECT name INTO v_actor FROM profiles WHERE id = auth.uid();
  PERFORM fn_notify(
    NEW.assignee_id, 'task_assigned', 'BD task assigned to you',
    COALESCE(v_actor, 'Someone') || ' assigned you “' || NEW.title || '”',
    'bd_task', NEW.id::text, auth.uid()
  );
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_bd_notify_task_assignee AFTER UPDATE OF assignee_id ON bd_tasks
  FOR EACH ROW EXECUTE FUNCTION fn_bd_notify_task_assignee();

CREATE OR REPLACE FUNCTION fn_bd_notify_lead_owner() RETURNS trigger AS $$
DECLARE v_actor text;
BEGIN
  IF NEW.owner_id IS NULL OR NEW.owner_id IS NOT DISTINCT FROM OLD.owner_id THEN
    RETURN NULL;
  END IF;
  SELECT name INTO v_actor FROM profiles WHERE id = auth.uid();
  PERFORM fn_notify(
    NEW.owner_id, 'task_assigned', 'Lead assigned to you',
    COALESCE(v_actor, 'Someone') || ' made you the owner of ' || NEW.company,
    'bd_lead', NEW.id::text, auth.uid()
  );
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_bd_notify_lead_owner AFTER UPDATE OF owner_id ON bd_leads
  FOR EACH ROW EXECUTE FUNCTION fn_bd_notify_lead_owner();

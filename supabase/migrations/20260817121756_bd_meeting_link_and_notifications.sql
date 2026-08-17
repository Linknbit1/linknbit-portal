-- Meetings: somewhere to put the join link, and a word to the people invited.
--
-- Two gaps in 20260817102310. `platform` recorded that a meeting was on Zoom but
-- not *which* Zoom, so the link lived in someone's head. And being added to a
-- meeting was completely silent: the row appeared on the invitee's My Meetings
-- page and nothing told them to look — which made the invitee read path shipped
-- in my_bd_meetings() pointless in practice.

-- ── 1. The join link ────────────────────────────────────────────────────────
-- Free text rather than a CHECK on the shape: meeting links are wildly
-- inconsistent (Zoom passcodes in the query string, Teams' encoded context
-- blobs, a dial-in string with a PIN), and a regex that rejects a real link is
-- worse than a column that accepts a wrong one. The client validates loosely.
ALTER TABLE bd_meetings ADD COLUMN join_url text;

-- ── 2. Being invited ────────────────────────────────────────────────────────
--
-- Fires per attendee row. The client diffs the guest list rather than replacing
-- it (see saveMeeting in src/api/bd.ts), so editing a meeting's title does not
-- re-notify everyone already on it — only genuinely new rows land here.
--
-- Deliberately notifies on the attendee row rather than on the meeting: a
-- meeting can be created with nobody on it and have people added days later, and
-- both paths should ping.
CREATE OR REPLACE FUNCTION fn_bd_notify_meeting_invite() RETURNS trigger AS $$
DECLARE
  v_actor   text;
  v_company text;
  v_when    timestamptz;
BEGIN
  -- Adding yourself is not an invitation.
  IF NEW.profile_id = auth.uid() THEN RETURN NULL; END IF;

  SELECT p.name INTO v_actor FROM profiles p WHERE p.id = auth.uid();
  SELECT COALESCE(l.company, 'a client'), m.scheduled_at
    INTO v_company, v_when
    FROM bd_meetings m
    LEFT JOIN bd_leads l ON l.id = m.lead_id
   WHERE m.id = NEW.meeting_id;

  PERFORM fn_notify(
    NEW.profile_id,
    'meeting_invite',
    'You have been added to a meeting',
    COALESCE(v_actor, 'Someone') || ' invited you to a meeting with ' || v_company
      || ' on ' || to_char(v_when, 'Dy DD Mon at HH24:MI'),
    'bd_meeting',
    NEW.meeting_id::text,
    auth.uid()
  );
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_bd_notify_meeting_invite AFTER INSERT ON bd_meeting_attendees
  FOR EACH ROW EXECUTE FUNCTION fn_bd_notify_meeting_invite();

-- ── 3. Being moved ──────────────────────────────────────────────────────────
-- A time change reaches everyone already on it, host included — the one edit
-- that invalidates what people have written in their own calendars.
CREATE OR REPLACE FUNCTION fn_bd_notify_meeting_moved() RETURNS trigger AS $$
DECLARE
  v_actor     text;
  v_company   text;
  v_recipient uuid;
BEGIN
  IF NEW.scheduled_at IS NOT DISTINCT FROM OLD.scheduled_at THEN RETURN NULL; END IF;

  SELECT p.name INTO v_actor FROM profiles p WHERE p.id = auth.uid();
  SELECT COALESCE(l.company, 'a client') INTO v_company
    FROM bd_leads l WHERE l.id = NEW.lead_id;

  FOR v_recipient IN
    SELECT a.profile_id FROM bd_meeting_attendees a WHERE a.meeting_id = NEW.id
    UNION
    SELECT NEW.host_id WHERE NEW.host_id IS NOT NULL
  LOOP
    PERFORM fn_notify(
      v_recipient,
      'meeting_updated',
      'A meeting was rescheduled',
      COALESCE(v_actor, 'Someone') || ' moved the ' || COALESCE(v_company, 'client')
        || ' meeting to ' || to_char(NEW.scheduled_at, 'Dy DD Mon at HH24:MI'),
      'bd_meeting',
      NEW.id::text,
      auth.uid()
    );
  END LOOP;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_bd_notify_meeting_moved AFTER UPDATE OF scheduled_at ON bd_meetings
  FOR EACH ROW EXECUTE FUNCTION fn_bd_notify_meeting_moved();

-- ── 4. Being cancelled ──────────────────────────────────────────────────────
--
-- BEFORE DELETE, not AFTER: bd_meeting_attendees cascades from this row, and the
-- cascade is itself an AFTER-trigger action. By the time an AFTER DELETE trigger
-- ran there would be no guest list left to notify.
--
-- Only for meetings that have not happened yet. Tidying up last quarter's
-- calendar should not ping fifteen people about meetings they already attended.
CREATE OR REPLACE FUNCTION fn_bd_notify_meeting_cancelled() RETURNS trigger AS $$
DECLARE
  v_actor     text;
  v_company   text;
  v_recipient uuid;
BEGIN
  IF OLD.scheduled_at < now() THEN RETURN OLD; END IF;

  SELECT p.name INTO v_actor FROM profiles p WHERE p.id = auth.uid();
  SELECT COALESCE(l.company, 'a client') INTO v_company
    FROM bd_leads l WHERE l.id = OLD.lead_id;

  FOR v_recipient IN
    SELECT a.profile_id FROM bd_meeting_attendees a WHERE a.meeting_id = OLD.id
    UNION
    SELECT OLD.host_id WHERE OLD.host_id IS NOT NULL
  LOOP
    PERFORM fn_notify(
      v_recipient,
      'meeting_updated',
      'A meeting was cancelled',
      COALESCE(v_actor, 'Someone') || ' cancelled the ' || COALESCE(v_company, 'client')
        || ' meeting set for ' || to_char(OLD.scheduled_at, 'Dy DD Mon at HH24:MI'),
      -- No resource_id: the meeting is about to stop existing, so a link to it
      -- would 404. The body carries everything the reader needs.
      'bd_meeting',
      NULL,
      auth.uid()
    );
  END LOOP;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_bd_notify_meeting_cancelled BEFORE DELETE ON bd_meetings
  FOR EACH ROW EXECUTE FUNCTION fn_bd_notify_meeting_cancelled();

-- Same hardening as 20260817105642: these are trigger functions, not endpoints.
REVOKE ALL ON FUNCTION fn_bd_notify_meeting_invite()    FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION fn_bd_notify_meeting_moved()     FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION fn_bd_notify_meeting_cancelled() FROM public, anon, authenticated;

-- ── 5. Carry the link through the invitee's read path ───────────────────────
-- my_bd_meetings() is the only way someone without can_view_bd sees a meeting,
-- so without this the people most likely to need the link are the ones who
-- cannot see it. Recreated in full because the return type changes.
DROP FUNCTION IF EXISTS my_bd_meetings();

CREATE OR REPLACE FUNCTION my_bd_meetings()
RETURNS TABLE (
  id               uuid,
  company          text,
  scheduled_at     timestamptz,
  duration_minutes integer,
  type             text,
  host_id          uuid,
  host_name        text,
  client_attendees text,
  platform         text,
  join_url         text,
  outcome          text,
  next_step        text,
  attendees        jsonb
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    m.id,
    COALESCE(l.company, '') AS company,
    m.scheduled_at,
    m.duration_minutes,
    m.type,
    m.host_id,
    COALESCE(h.name, 'Unassigned') AS host_name,
    m.client_attendees,
    m.platform,
    m.join_url,
    m.outcome,
    m.next_step,
    COALESCE(
      (
        SELECT jsonb_agg(jsonb_build_object('id', p.id, 'name', p.name) ORDER BY p.name)
        FROM bd_meeting_attendees a
        JOIN profiles p ON p.id = a.profile_id
        WHERE a.meeting_id = m.id
      ),
      '[]'::jsonb
    ) AS attendees
  FROM bd_meetings m
  LEFT JOIN bd_leads l ON l.id = m.lead_id
  LEFT JOIN profiles h ON h.id = m.host_id
  WHERE
    is_internal()
    AND (
      m.host_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM bd_meeting_attendees a
        WHERE a.meeting_id = m.id AND a.profile_id = auth.uid()
      )
    )
  ORDER BY m.scheduled_at;
$$;

REVOKE ALL ON FUNCTION my_bd_meetings() FROM public, anon;
GRANT EXECUTE ON FUNCTION my_bd_meetings() TO authenticated;

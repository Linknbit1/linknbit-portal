-- Your own client meetings, whether or not you are in BD.
--
-- /meetings (Workspace → My Meetings) is open to every internal member: a team
-- lead pulled into a negotiation is an attendee, not a BD user. They hold no
-- can_view_bd, so bd_meetings and bd_leads are both closed to them by RLS — and
-- an invitation you cannot see is not an invitation.
--
-- Why an RPC rather than a second SELECT policy:
--
--   The card needs the prospect's name, which lives on bd_leads. A policy on
--   bd_meetings alone would render every invitation with a blank company, and
--   widening bd_leads to "anyone invited to any meeting about you" would expose
--   deal values and contact details to people with no business seeing them.
--
--   This returns exactly the four fields the card shows, for exactly the
--   meetings you are on. Nothing else about the pipeline leaks.
--
-- Note the deliberate asymmetry with the rest of the module: this is the one
-- place BD data is readable without can_view_bd, and it is readable only about
-- yourself.

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
    -- Still an employee. SECURITY DEFINER bypasses RLS, so the departed-staff
    -- gate that is_internal() normally applies has to be stated here.
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

REVOKE ALL ON FUNCTION my_bd_meetings() FROM public;
GRANT EXECUTE ON FUNCTION my_bd_meetings() TO authenticated;

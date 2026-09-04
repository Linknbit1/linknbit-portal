-- Attendance calendar: everybody's planned absence across a span of dates.
--
-- The calendar read leave_requests, wfh_requests and attendance_exceptions
-- directly, so RLS decided what it showed — and RLS on those tables is written
-- for the REQUEST (its reason, its approver, its type), not for the fact that
-- somebody is away. The result was that an ordinary employee saw their own leave
-- and the public holidays, while `day_roster` showed that same employee the
-- whole company's status for today. The same fact was public on one screen and
-- private on the other, which was an accident of plumbing rather than a policy.
--
-- This draws the line where day_roster already draws it:
--
--   Presence is not privileged.  Everyone internal sees THAT somebody is away
--   and whether it is a full or half day. "Who is off on the 14th" is a question
--   the whole company has, and hiding it is what sends people to chat to ask.
--
--   The reason is privileged.  The leave TYPE — "Sick leave", "Bereavement" —
--   comes back only for yourself, people you share a team with, and attendance
--   managers. Everyone else gets a null label and the UI says "Away".
--
--   Exceptions are privileged outright.  A late arrival is a performance fact,
--   not a planning fact, so rows are OMITTED for anyone not entitled to them
--   rather than returned blank.
--
-- Pending as well as approved. A day that looks fully staffed while three
-- requests for it sit undecided is the one thing a planning view must not do, so
-- `status` comes back and the client marks the two differently. Only these two:
-- a rejected request is not a plan, and a withdrawn one no longer exists.
--
-- Additive: a new function only. Nothing existing changes shape, so a deployed
-- client that has never heard of it keeps working.

CREATE OR REPLACE FUNCTION public.month_roster(p_from date, p_to date)
RETURNS TABLE (
  entry_id       uuid,
  profile_id     uuid,
  name           text,
  avatar_url     text,
  kind           text,   -- 'leave' | 'wfh' | 'exception'
  status         text,   -- 'approved' | 'pending'
  start_date     date,
  end_date       date,
  day_part       text,
  -- Leave type / exception type. Null when the viewer may not see the reason.
  label          text,
  label_color    text,
  exception_type text,
  requested_time time,
  return_time    time,
  detail_visible boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_manage boolean;
BEGIN
  IF NOT is_internal() THEN
    RAISE EXCEPTION 'month_roster: internal users only';
  END IF;

  -- A span is capped so a mistyped custom range cannot ask for a decade.
  IF p_to < p_from OR p_to - p_from > 366 THEN
    RAISE EXCEPTION 'month_roster: span must be between 0 and 366 days';
  END IF;

  v_manage := has_feature('can_view_all_attendance');

  RETURN QUERY
  -- Leave. Overlap, not containment: a week starting in one month and ending in
  -- the next belongs to both, and filtering on the first day alone loses it.
  SELECT
    lr.id,
    p.id,
    p.name,
    p.avatar_url,
    'leave'::text,
    lr.status,
    lr.start_date,
    lr.end_date,
    lr.day_part,
    CASE WHEN vis.ok THEN lt.name END,
    CASE WHEN vis.ok THEN lt.color END,
    NULL::text,
    NULL::time,
    NULL::time,
    vis.ok
  FROM leave_requests lr
  JOIN profiles p ON p.id = lr.profile_id
  LEFT JOIN leave_types lt ON lt.id = lr.leave_type_id
  CROSS JOIN LATERAL (
    -- Every term null-safe: a NULL from any one of them would make the whole OR
    -- NULL, and the UI reads a null flag as "not loaded" rather than "not
    -- allowed". `= auth.uid()` is the subtle one — NULL, not false, with no session.
    SELECT (coalesce(v_manage, false)
            OR p.id IS NOT DISTINCT FROM auth.uid()
            OR coalesce(shares_team_with(p.id), false)) AS ok
  ) vis
  WHERE lr.status IN ('approved', 'pending')
    AND p.is_active
    AND lr.start_date <= p_to
    AND lr.end_date >= p_from

  UNION ALL

  SELECT
    wr.id,
    p.id,
    p.name,
    p.avatar_url,
    'wfh'::text,
    wr.status,
    wr.start_date,
    wr.end_date,
    wr.day_part,
    NULL::text,   -- WFH has no type to withhold; the kind is the whole story
    NULL::text,
    NULL::text,
    NULL::time,
    NULL::time,
    (coalesce(v_manage, false)
     OR p.id IS NOT DISTINCT FROM auth.uid()
     OR coalesce(shares_team_with(p.id), false))
  FROM wfh_requests wr
  JOIN profiles p ON p.id = wr.profile_id
  WHERE wr.status IN ('approved', 'pending')
    AND p.is_active
    AND wr.start_date <= p_to
    AND wr.end_date >= p_from

  UNION ALL

  -- Exceptions, for the entitled only. The WHERE drops them rather than blanking
  -- them: a row saying somebody had *something* at 10:40 is the same disclosure.
  SELECT
    ae.id,
    p.id,
    p.name,
    p.avatar_url,
    'exception'::text,
    ae.status,
    ae.date,
    ae.date,
    'full'::text,
    NULL::text,
    NULL::text,
    ae.exception_type,
    ae.requested_time,
    ae.return_time,
    true
  FROM attendance_exceptions ae
  JOIN profiles p ON p.id = ae.profile_id
  WHERE ae.status IN ('approved', 'pending')
    AND p.is_active
    AND ae.date BETWEEN p_from AND p_to
    AND (coalesce(v_manage, false)
         OR p.id IS NOT DISTINCT FROM auth.uid()
         OR coalesce(shares_team_with(p.id), false));
END;
$$;

REVOKE ALL ON FUNCTION public.month_roster(date, date) FROM public;
GRANT EXECUTE ON FUNCTION public.month_roster(date, date) TO authenticated;

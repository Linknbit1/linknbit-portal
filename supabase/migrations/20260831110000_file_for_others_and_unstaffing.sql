-- Two unrelated gaps, both about somebody acting on another person's record.
--
-- 1. Leave and WFH could be filed for an employee; exceptions and overtime
--    could not, so the one screen that says "add for someone else" only meant
--    it half the time.
--
-- 2. Assigning someone to a task staffs them onto its service. Taking them off
--    the service did not take them off the tasks, so a person removed from the
--    Development block stayed assignee and reviewer on its work — off the
--    roster, still holding the job.

-- ── 1. Filing an exception or an overtime claim for somebody else ────────────
-- Recorded rather than silent: without this the row reads as though the person
-- raised it themselves, which is a bad thing to discover on your own record.
ALTER TABLE attendance_exceptions
  ADD COLUMN IF NOT EXISTS entered_by uuid REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE overtime_requests
  ADD COLUMN IF NOT EXISTS entered_by uuid REFERENCES profiles(id) ON DELETE SET NULL;

-- Always `pending`, whoever files it — unlike leave and WFH, where an admin's
-- entry applies at once. An exception rewrites a day that is already recorded
-- and an overtime claim is a claim; both want a second pair of eyes, and the
-- filer can approve it themselves in the next click if they hold that too.
DROP POLICY IF EXISTS p_exc_own_insert ON attendance_exceptions;
CREATE POLICY p_exc_insert ON attendance_exceptions FOR INSERT
  WITH CHECK (
    status = 'pending'
    AND (
      (profile_id = auth.uid() AND entered_by IS NULL)
      OR (
        profile_id <> auth.uid()
        AND entered_by = auth.uid()
        AND has_feature('can_manage_attendance')
      )
    )
  );

DROP POLICY IF EXISTS p_ot_insert ON overtime_requests;
CREATE POLICY p_ot_insert ON overtime_requests FOR INSERT
  WITH CHECK (
    status = 'pending'
    AND (
      (profile_id = auth.uid() AND entered_by IS NULL)
      OR (
        profile_id <> auth.uid()
        AND entered_by = auth.uid()
        AND has_feature('can_manage_attendance')
      )
    )
  );

-- ── 2. What a person is still holding in a service block ─────────────────────
-- SECURITY DEFINER so the count is the true one: a lead taking somebody off a
-- block can only read the tasks they can see, and an undercount here is a
-- warning that says "nothing to lose" about work there is.
CREATE OR REPLACE FUNCTION public.service_member_task_load(
  p_project_service_id uuid,
  p_profile_id         uuid
) RETURNS TABLE (assigned int, reviewing int, tasks int)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH held AS (
    SELECT
      t.id,
      (
        t.assignee_id = p_profile_id
        OR EXISTS (
          SELECT 1 FROM task_assignees ta
           WHERE ta.task_id = t.id AND ta.profile_id = p_profile_id
        )
      ) AS is_assignee,
      EXISTS (
        SELECT 1 FROM task_reviewers tr
         WHERE tr.task_id = t.id AND tr.profile_id = p_profile_id
      ) AS is_reviewer
    FROM tasks t
    WHERE t.project_service_id = p_project_service_id
      AND t.deleted_at IS NULL
  )
  SELECT
    COUNT(*) FILTER (WHERE is_assignee)::int,
    COUNT(*) FILTER (WHERE is_reviewer)::int,
    COUNT(*) FILTER (WHERE is_assignee OR is_reviewer)::int
  FROM held;
$$;

COMMENT ON FUNCTION public.service_member_task_load(uuid, uuid) IS
  'How many live tasks in this service block the person is assignee or reviewer on.';

-- ── Taking somebody off a service block, and off its work ────────────────────
-- Comments are deliberately untouched: what somebody said about a task is a
-- record of the conversation, not a claim on the work, and deleting it would
-- leave replies answering nobody.
CREATE OR REPLACE FUNCTION public.unstaff_service_member(
  p_project_service_id uuid,
  p_profile_id         uuid
) RETURNS TABLE (unassigned int, unreviewed int)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_unassigned int;
  v_unreviewed int;
  v_primary    int;
BEGIN
  -- Mirrors the service_members write policy this replaces.
  IF NOT (is_internal() AND has_feature('can_manage_projects')) THEN
    RAISE EXCEPTION 'Not allowed to change project staffing';
  END IF;

  DELETE FROM task_assignees ta
   USING tasks t
   WHERE ta.task_id = t.id
     AND t.project_service_id = p_project_service_id
     AND t.deleted_at IS NULL
     AND ta.profile_id = p_profile_id;
  GET DIAGNOSTICS v_unassigned = ROW_COUNT;

  DELETE FROM task_reviewers tr
   USING tasks t
   WHERE tr.task_id = t.id
     AND t.project_service_id = p_project_service_id
     AND t.deleted_at IS NULL
     AND tr.profile_id = p_profile_id;
  GET DIAGNOSTICS v_unreviewed = ROW_COUNT;

  -- The legacy single-assignee column. Nulling it does not re-staff anyone:
  -- fn_staff_service_on_assignee_column only acts on a non-null assignee.
  UPDATE tasks
     SET assignee_id = NULL
   WHERE project_service_id = p_project_service_id
     AND deleted_at IS NULL
     AND assignee_id = p_profile_id;
  GET DIAGNOSTICS v_primary = ROW_COUNT;

  DELETE FROM service_members
   WHERE project_service_id = p_project_service_id
     AND profile_id = p_profile_id;

  -- A task held only through the old column still counted as one they were on.
  RETURN QUERY SELECT GREATEST(v_unassigned, v_primary), v_unreviewed;
END;
$$;

COMMENT ON FUNCTION public.unstaff_service_member(uuid, uuid) IS
  'Removes somebody from a service block and from every live task in it. Comments are left alone.';

REVOKE ALL ON FUNCTION public.service_member_task_load(uuid, uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.service_member_task_load(uuid, uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.unstaff_service_member(uuid, uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.unstaff_service_member(uuid, uuid) TO authenticated;

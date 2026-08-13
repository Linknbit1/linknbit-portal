-- Only sign-off roles may declare a task finished.
--
-- fn_guard_task_approval already blocked moves into 'approved'. It let anyone
-- drag a card into 'completed', which is the same claim by another name — the
-- board treats both as done, and project progress counts both. Marking your own
-- work complete is exactly the call this restriction exists to prevent.
--
-- 'closed' is not a status in this system; the terminal pair is approved and
-- completed. Anything else (backlog → todo → in_progress → review, and blocked)
-- stays open to whoever is doing the work.
--
-- Team Lead is added to can_approve_tasks: the rule is "PMs and Team Leads", and
-- leads held none of it before. Admin and Super Admin pass through the
-- `administrator` short-circuit in has_feature(), as everywhere else.

CREATE OR REPLACE FUNCTION public.fn_guard_task_approval()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IN ('approved', 'completed')
     AND OLD.status IS DISTINCT FROM NEW.status
     AND NOT has_feature('can_approve_tasks') THEN
    RAISE EXCEPTION 'forbidden_task_signoff'
      USING HINT = 'Only a project manager or team lead can mark a task approved or completed.';
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.fn_guard_task_approval() IS
  'Refuses a task moving into approved/completed unless the actor holds can_approve_tasks.';

-- Sharpen the catalogue entry now that it governs completion too.
UPDATE permissions
   SET label       = 'Approve and complete tasks',
       description = 'Move a task into Approved or Completed — the sign-off that says the work is done.'
 WHERE key = 'can_approve_tasks';

INSERT INTO role_permissions (role_id, permission_key)
SELECT r.id, 'can_approve_tasks'
  FROM roles r
 WHERE r.name = 'Team Lead'
ON CONFLICT (role_id, permission_key) DO NOTHING;

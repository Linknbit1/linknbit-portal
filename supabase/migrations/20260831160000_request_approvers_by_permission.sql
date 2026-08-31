-- Who gets told a request is waiting.
--
-- fn_request_approvers listed three role names. It already reached admins when
-- HR filed leave for somebody — the notification exists and always has — but
-- the reason it reached them was that one of the three strings happened to be
-- 'admin'. A role built on the Roles screen and given can_approve_requests was
-- told nothing, and renaming a role would have silently changed who hears about
-- a pending request.
--
-- Now it is the permission, which is the same set today: super_admin, admin and
-- hr all hold can_approve_requests. Team leads keep their own branch — they are
-- told about their own people's requests without holding the permission, which
-- is deliberate and has nothing to do with approving.
--
-- fn_notify already drops the actor, so whoever filed the request is never told
-- about it.

CREATE OR REPLACE FUNCTION public.fn_request_approvers(p_requester uuid)
RETURNS TABLE(profile_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id
    FROM profiles p
   WHERE p.is_active
     AND p.id <> p_requester
     AND EXISTS (
       SELECT 1
         FROM profile_roles pr
         JOIN role_permissions rp ON rp.role_id = pr.role_id
        WHERE pr.profile_id = p.id
          AND rp.permission_key IN ('can_approve_requests', 'administrator')
     )
  UNION
  SELECT t.lead_id
    FROM team_members tm
    JOIN teams t ON t.id = tm.team_id
   WHERE tm.profile_id = p_requester
     AND t.lead_id IS NOT NULL
     AND t.lead_id <> p_requester;
$$;

COMMENT ON FUNCTION public.fn_request_approvers(uuid) IS
  'Everyone to tell about a pending request: anyone who can approve requests, plus the requester''s team leads. Never the requester.';

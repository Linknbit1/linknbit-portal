-- Who is in the BD department?
--
-- Every picker in the module needs this list — lead owner, task assignee,
-- meeting host, the rows on the Targets page — and until now it read a hardcoded
-- array of three fictional names in src/data/bdMock.ts.
--
-- It cannot be a plain PostgREST query. The answer is "everyone holding
-- can_view_bd", which lives across profile_roles → role_permissions, and
-- role_permissions is not readable by an ordinary employee — so a client-side
-- join would come back empty for exactly the people who need it. Hence
-- SECURITY DEFINER, with the caller's own access checked first.
--
-- Deliberately permission-derived rather than role-derived: someone given BD
-- access through a custom role, or an admin who inherits it through
-- 'administrator', belongs in these dropdowns just as much as a bd_rep. That is
-- also why 'administrator' is matched here the same way has_feature() matches it.
--
-- Deactivated people are excluded: they have left the company, so they must not
-- appear in a picker. Leads they still own keep resolving through profiles,
-- which is untouched — the same split every other roster in the portal makes.

CREATE OR REPLACE FUNCTION bd_people()
RETURNS TABLE (id uuid, name text, avatar_url text, role text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT DISTINCT p.id, p.name, p.avatar_url, p.role
  FROM profiles p
  JOIN profile_roles pr   ON pr.profile_id = p.id
  JOIN role_permissions rp ON rp.role_id = pr.role_id
  WHERE p.is_active
    AND rp.permission_key IN ('can_view_bd', 'administrator')
    -- The caller must be in BD themselves to see who else is.
    AND has_feature('can_view_bd')
  ORDER BY p.name;
$$;

REVOKE ALL ON FUNCTION bd_people() FROM public;
GRANT EXECUTE ON FUNCTION bd_people() TO authenticated;

-- administrator is the wildcard branch inside has_feature(), so a role holding
-- it holds every permission in the catalogue — including ones added later, and
-- including the hidden ones. Only super_admin is meant to be that.
--
-- Admin keeps the 37 permissions it holds explicitly; what it actually loses is
-- can_manage_levels, can_view_team_standups, the hidden can_use_sticky_notes,
-- and its unbounded rank in top_role_position() — an Admin can no longer edit a
-- role at or above position 90, which is what stopped them reaching super_admin.
--
-- Developer holds administrator and nothing else, so this empties it. That is
-- the point: it was a wildcard wearing a job title. Its one member also holds
-- Admin and keeps that access.
--
-- super_admin is deliberately untouched, which is also what keeps
-- fn_assert_role_admin_exists() satisfied.
DELETE FROM role_permissions rp
USING roles r
WHERE r.id = rp.role_id
  AND r.slug IN ('admin', 'developer')
  AND rp.permission_key = 'administrator';

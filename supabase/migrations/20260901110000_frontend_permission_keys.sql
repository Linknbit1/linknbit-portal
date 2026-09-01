-- The keys and helpers the front end needed to stop reading role names.
--
-- Applied alongside the front-end change that uses them. Each is granted to the
-- roles that held the ability by name, so behaviour is unchanged.

-- Who may be picked as a team's lead. The picker read `role === 'team_lead'`.
-- Also goes to the roles that could always have been chosen in practice.
INSERT INTO permissions (key, label, description, category, sort_order, is_hidden)
VALUES
  ('can_view_cross_team_attendance', 'View attendance across teams',
   'See the inline team attendance panel covering every team you touch, rather than one team at a time.',
   'Attendance', 48, false),
  ('can_lead_team', 'Be a team lead',
   'Can be picked as the lead of a team. Leading a team is what grants the team-scoped views that come with it.',
   'People', 33, false),
  ('can_delete_people', 'Delete people',
   'Permanently remove a person''s account. Separate from managing people, which HR does without this.',
   'People', 34, false),
  ('can_impersonate', 'Log in as another member',
   'Start a session as somebody else, for support. You can only step into someone you outrank.',
   'Governance', 12, false)
ON CONFLICT (key) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_key)
SELECT r.id, 'can_view_cross_team_attendance' FROM roles r WHERE r.slug = 'project_manager'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_key)
SELECT r.id, 'can_lead_team' FROM roles r
 WHERE r.slug IN ('team_lead', 'project_manager', 'admin', 'super_admin')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_key)
SELECT r.id, k FROM roles r CROSS JOIN (VALUES ('can_delete_people'), ('can_impersonate')) v(k)
 WHERE r.slug IN ('super_admin', 'admin')
ON CONFLICT DO NOTHING;

-- The Standup and Participation settings sections were open to HR by role name.
INSERT INTO role_permissions (role_id, permission_key)
SELECT r.id, 'can_manage_standups' FROM roles r WHERE r.slug = 'hr'
ON CONFLICT DO NOTHING;

-- Everyone who holds a permission — what a "who may be chosen" picker needs,
-- since the front end knows each person's role but not their permissions.
CREATE OR REPLACE FUNCTION public.profiles_with_feature(p_key text)
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id
    FROM profiles p
   WHERE p.is_active
     AND is_internal_profile(p.id)
     AND profile_has_feature(p.id, p_key);
$$;

-- The Standup nav item listed six roles with the comment "everyone internal
-- except finance". Participation is already settings-driven, so the nav asks
-- the same question instead of restating a stale guess.
CREATE OR REPLACE FUNCTION public.am_i_standup_participant()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL AND fn_standup_participant(auth.uid());
$$;

REVOKE ALL ON FUNCTION public.profiles_with_feature(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.profiles_with_feature(text) TO authenticated;
REVOKE ALL ON FUNCTION public.am_i_standup_participant() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.am_i_standup_participant() TO authenticated;

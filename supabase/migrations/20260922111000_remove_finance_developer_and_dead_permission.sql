-- Finance and Developer removed, on the user's call; one dead permission with them.
--
-- Finance: no holders, not needed for now. Developer: identical to Employee in
-- everything that matters (zero permissions); its one holder, Zain Malik, also
-- holds Admin and loses nothing.
--
-- can_view_cross_team_attendance is deleted rather than wired up. It was granted
-- to Project Manager and referenced by nothing — no policy, no function, no React
-- file — and "cross team" never had a definition, so wiring it would have meant
-- inventing the rule as well as the plumbing. A PM keeps can_view_team_attendance;
-- can_view_all_attendance is the key that exists if they need more.

ALTER TABLE roles DISABLE TRIGGER USER;

DELETE FROM profile_roles   WHERE role_id IN (SELECT id FROM roles WHERE slug IN ('finance', 'developer'));
DELETE FROM role_permissions WHERE role_id IN (SELECT id FROM roles WHERE slug IN ('finance', 'developer'));
DELETE FROM roles            WHERE slug IN ('finance', 'developer');

ALTER TABLE roles ENABLE TRIGGER USER;

DELETE FROM role_permissions WHERE permission_key = 'can_view_cross_team_attendance';
DELETE FROM permissions      WHERE key            = 'can_view_cross_team_attendance';

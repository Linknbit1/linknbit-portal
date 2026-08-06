-- Who may open the time backlog — the aggregate "who tracked how long on which
-- project and task" view on Projects and Tasks.
--
-- This gates the *view*, not the data. task_time_entries RLS already decides whose
-- segments anyone can read (own time always, a team's with shares_team_with, all
-- of it for management), and that stays untouched: an employee still needs to see
-- their own timer. What this permission controls is access to the rolled-up
-- picture across people and projects, which is a management lens rather than
-- something everyone needs.
--
-- The Settings UI reads the permissions catalogue directly, so inserting the row
-- is all that's needed for the switch to appear under Projects.

INSERT INTO permissions (key, label, description, category, sort_order)
VALUES (
  'can_view_backlog',
  'View time backlog',
  'Open the time backlog: who tracked how long on which project and task, including per-person totals.',
  'Projects',
  16
)
ON CONFLICT (key) DO UPDATE
SET label       = EXCLUDED.label,
    description = EXCLUDED.description,
    category    = EXCLUDED.category,
    sort_order  = EXCLUDED.sort_order;

-- Seeded to the roles that already carry delivery oversight. Team Lead is
-- included because their RLS scope (shares_team_with) already lets them read
-- their own team's time, so the view shows them nothing new — just organised.
INSERT INTO role_permissions (role_id, permission_key)
SELECT r.id, 'can_view_backlog'
FROM roles r
WHERE r.name IN ('Team Lead', 'Project Manager', 'Admin', 'Super Admin')
ON CONFLICT (role_id, permission_key) DO NOTHING;

-- Phase 2, batch 2a: mint the permission keys the remaining policies need.
--
-- Each key is seeded to reproduce the EXACT role set its policies name today,
-- so converting those policies changes nobody's access. Where an existing key
-- was close but not identical, a new one is minted rather than accepting drift
-- - e.g. the 12 delivery-write policies name {super_admin, admin,
-- project_manager}, while can_manage_projects also includes team_lead.
--
-- Nothing reads these keys until batch 2b converts the policies.

insert into permissions (key, label, category, sort_order, description) values
  ('can_edit_delivery',             'Edit delivery items',        'Projects',   13, 'Create and edit stages, tasks, attachments, approvals and watchers.'),
  ('can_view_all_projects',         'View all projects',          'Projects',   14, 'See every project and its tasks, stages and files, not only those you are a member of.'),
  ('can_view_team_attendance',      'View team attendance',       'Attendance', 43, 'See attendance, leave, WFH and overtime for people who share a team with you.'),
  ('can_delete_attendance_records', 'Delete attendance records',  'Attendance', 44, 'Permanently remove leave, WFH, overtime and exception records.'),
  ('can_manage_job_types',          'Manage job-type policies',   'Attendance', 45, 'Configure on-site, hybrid and remote check-in rules.'),
  ('can_view_salaries',             'View salaries',              'People',     31, 'See and edit employee compensation records.'),
  ('can_edit_any_profile',          'Edit any profile',           'People',     32, 'Directly edit another person''s profile details.'),
  ('can_view_standups',             'View standups',              'Standups',   61, 'Read standup entries for your team.'),
  ('can_moderate_comments',         'Moderate comments',          'Governance', 6,  'Edit or delete comments written by other people.'),
  ('can_manage_services',           'Manage services',            'Governance', 7,  'Create and edit the service catalogue.'),
  ('can_manage_redemptions',        'Manage reward redemptions',  'Governance', 8,  'Approve and update reward redemption requests.'),
  ('can_manage_levels',             'Manage levels',              'Governance', 9,  'Edit the XP level ladder.')
on conflict (key) do nothing;

-- Seed each key to the exact role set its policies name today.
insert into role_permissions (role_id, permission_key)
select r.id, k.key
from roles r
join (values
  ('can_edit_delivery',             array['super_admin','admin','project_manager']),
  ('can_view_all_projects',         array['super_admin','admin','project_manager','finance']),
  ('can_view_team_attendance',      array['super_admin','admin','project_manager','team_lead']),
  ('can_delete_attendance_records', array['super_admin','admin']),
  ('can_manage_job_types',          array['super_admin','admin']),
  ('can_view_salaries',             array['super_admin','admin','hr']),
  ('can_edit_any_profile',          array['super_admin','admin']),
  ('can_view_standups',             array['super_admin','admin','hr','project_manager','team_lead']),
  ('can_moderate_comments',         array['super_admin','admin']),
  ('can_manage_services',           array['super_admin','admin']),
  ('can_manage_redemptions',        array['super_admin','admin']),
  ('can_manage_levels',             array['super_admin'])
) as k(key, slugs) on r.slug = any(k.slugs)
on conflict do nothing;

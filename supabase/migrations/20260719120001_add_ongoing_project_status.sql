-- Add an "ongoing" project status for retainer / continuous engagements
-- (marketing, SEO, support, change-requests) that never reach "completed".
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_status_check;
ALTER TABLE projects ADD CONSTRAINT projects_status_check
  CHECK (status IN ('in_progress', 'blocked', 'awaiting_client', 'completed', 'on_hold', 'ongoing'));

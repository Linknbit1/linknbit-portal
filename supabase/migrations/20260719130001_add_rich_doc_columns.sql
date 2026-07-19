-- Rich-text (TipTap/ProseMirror JSON) content columns. The existing plain-text
-- columns (projects.description, tasks.description, comments.content) stay as the
-- searchable / notification-body / card-excerpt mirror; `doc` holds the full
-- WYSIWYG document (headings, links, @mentions, file refs).
ALTER TABLE projects ADD COLUMN IF NOT EXISTS doc jsonb;
ALTER TABLE tasks    ADD COLUMN IF NOT EXISTS doc jsonb;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS doc jsonb;

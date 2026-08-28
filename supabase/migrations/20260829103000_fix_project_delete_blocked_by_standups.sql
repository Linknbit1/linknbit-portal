-- Deleting a project failed outright if anyone had ever logged a standup against
-- it:
--
--   ERROR: new row for relation "standup_entries" violates check constraint
--          "standup_entries_has_subject"
--
-- standup_entries.project_id is ON DELETE SET NULL, and standup_entries_has_subject
-- demands a project_id OR a title of at least three characters. An entry written
-- against a project has no title, because the project WAS its subject, so the
-- moment the FK nulls it the row has no subject left and the whole delete rolls
-- back. Nobody could delete a project that had been worked on, which is every
-- project worth deleting.
--
-- The snapshot to heal it with is already on the row: standup_entries.project_name
-- is captured at submission time for exactly this reason. Promote it to the title
-- as the project goes, so the entry still reads as what it was rather than the
-- constraint being loosened to permit a row that says nothing.
CREATE OR REPLACE FUNCTION fn_standup_entry_keep_subject()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF OLD.project_id IS NOT NULL AND NEW.project_id IS NULL
     AND length(btrim(coalesce(NEW.title, ''))) < 3 THEN
    NEW.title := coalesce(nullif(btrim(NEW.project_name), ''), 'Deleted project');
  END IF;
  RETURN NEW;
END;
$$;

-- BEFORE, so it runs ahead of the check constraint the SET NULL would otherwise
-- break. Scoped to project_id: nothing else can take the subject away.
DROP TRIGGER IF EXISTS trg_standup_entries_keep_subject ON standup_entries;
CREATE TRIGGER trg_standup_entries_keep_subject
  BEFORE UPDATE OF project_id ON standup_entries
  FOR EACH ROW EXECUTE FUNCTION fn_standup_entry_keep_subject();

-- Entries already orphaned by an earlier delete that somehow got through.
UPDATE standup_entries
   SET title = coalesce(nullif(btrim(project_name), ''), 'Deleted project')
 WHERE project_id IS NULL
   AND length(btrim(coalesce(title, ''))) < 3;

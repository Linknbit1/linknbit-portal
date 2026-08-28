-- Trigger functions should not be callable over the API.
--
-- Every function in `public` is exposed at /rest/v1/rpc/<name> by default, and
-- these are all SECURITY DEFINER, so anyone signed in could invoke them
-- directly and hand them arguments the trigger machinery would never produce.
-- fn_notify_task_reviewers was the one the advisor named, and it would have let
-- a caller fabricate a "ready for your review" notification.
--
-- A trigger does not need EXECUTE: it runs as part of the statement that fired
-- it, under the table owner. Revoking changes nothing about how they work and
-- takes them off the API surface entirely.
--
-- The predicate functions are deliberately NOT in this list. task_visible,
-- can_access_task, is_project_manager and friends are evaluated inside RLS
-- policies with the caller's own privileges, so `authenticated` must keep
-- EXECUTE or every policy using them fails closed.
DO $$
DECLARE fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'fn_queue_storage_cleanup()',
    'fn_purge_attachments_on_message_delete()',
    'fn_standup_entry_keep_subject()',
    'fn_stamp_task_created_by()',
    'fn_sync_manager_id_to_table()',
    'fn_sync_table_to_manager_id()',
    'fn_staff_service_on_task_link()',
    'fn_staff_service_on_assignee_column()',
    'fn_notify_task_reviewers()'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM public, anon, authenticated', fn);
  END LOOP;
END $$;

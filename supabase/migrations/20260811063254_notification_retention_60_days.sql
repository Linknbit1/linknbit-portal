-- Notification retention: a notification is deleted once it turns 60 days old.
--
-- The table only ever grew — 1,052 rows two months into use, and nothing ever
-- removed a row. A notification is a nudge about something that already
-- happened; the thing it points at (task, approval, shoutout) keeps its own
-- history, so past two months the row is noise in a table every page reads on
-- load.
--
-- Read state is irrelevant here: an unread 60-day-old notification is not a
-- backlog item, it is a nudge nobody needed.
--
-- Nothing references notifications by foreign key, so the delete is self
-- contained. To stop it:
--   SELECT cron.unschedule('purge-old-notifications');

CREATE OR REPLACE FUNCTION fn_purge_old_notifications()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM notifications WHERE created_at < now() - interval '60 days';
END;
$$;

COMMENT ON FUNCTION fn_purge_old_notifications() IS
  'Deletes notifications older than 60 days. Runs nightly via the purge-old-notifications cron job.';

-- Re-runnable: drop any existing schedule before adding this one.
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'purge-old-notifications';

-- 19:20 UTC = 00:20 Asia/Karachi — after the 18:59 auto-checkout, well clear of
-- the other jobs, and nobody is waiting on a notification at that hour.
SELECT cron.schedule(
  'purge-old-notifications',
  '20 19 * * *',
  'SELECT fn_purge_old_notifications()'
);

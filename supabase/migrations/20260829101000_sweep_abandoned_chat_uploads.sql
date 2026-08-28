-- One more way a file ends up owned by nobody, and it is the one the sweeper
-- could not see.
--
-- A chat file is uploaded before the message exists: the row is written with
-- message_id NULL so the composer can show a thumbnail straight away, and
-- sending the message links it. Attach a file, change your mind, close the tab,
-- and the row stays NULL for ever. fn_sweep_orphan_storage looks for objects
-- with no row, and this one HAS a row, so it walks straight past it.
--
-- Deleting the stale row is all that is needed: trg_message_attachments_queue_cleanup
-- fires on the delete and queues the file, which is the same path everything
-- else takes.
--
-- A day is deliberately generous. A composer draft is not worth racing, and the
-- cost of waiting is one thumbnail's worth of storage.
CREATE OR REPLACE FUNCTION fn_sweep_abandoned_chat_uploads(p_grace interval DEFAULT interval '24 hours')
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_removed integer;
BEGIN
  DELETE FROM message_attachments
   WHERE message_id IS NULL
     AND created_at < now() - p_grace;

  GET DIAGNOSTICS v_removed = ROW_COUNT;
  RETURN v_removed;
END;
$$;

COMMENT ON FUNCTION fn_sweep_abandoned_chat_uploads(interval) IS
  'Removes chat uploads that were never sent. The delete trigger queues their files for the janitor.';

-- Folded into the existing sweep rather than given a schedule of its own: they
-- are the same job, and two crons doing half of it each is how one of them ends
-- up quietly unscheduled.
CREATE OR REPLACE FUNCTION fn_sweep_orphan_storage(p_grace interval DEFAULT interval '1 hour')
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, storage AS $$
DECLARE v_found integer;
BEGIN
  -- First, so the files these rows own are queued by the delete trigger and
  -- counted in this run rather than the next one.
  PERFORM fn_sweep_abandoned_chat_uploads();

  INSERT INTO storage_cleanup_queue (bucket_id, storage_path, reason)
  SELECT o.bucket_id, o.name, 'no owning row'
    FROM storage.objects o
   WHERE o.created_at < now() - p_grace
     AND (
       (o.bucket_id = 'attachments'
        AND NOT EXISTS (SELECT 1 FROM attachments a WHERE a.storage_path = o.name))
       OR
       (o.bucket_id = 'chat-attachments'
        AND NOT EXISTS (SELECT 1 FROM message_attachments m WHERE m.storage_path = o.name))
     )
  ON CONFLICT (bucket_id, storage_path) DO NOTHING;

  GET DIAGNOSTICS v_found = ROW_COUNT;
  RETURN v_found;
END;
$$;

REVOKE ALL ON FUNCTION fn_sweep_abandoned_chat_uploads(interval) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION fn_sweep_orphan_storage(interval)         FROM public, anon, authenticated;

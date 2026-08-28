-- No orphan files.
--
-- Every foreign key into `attachments` and `message_attachments` cascades, so
-- deleting a project, task, lead, BD task, message or channel takes the rows
-- with it. Nothing ever took the FILES with it: the row vanished and the object
-- stayed in the bucket, unreachable and still billed. There are two ways for a
-- file to end up with nobody pointing at it, and they need different answers:
--
--   1. The row went away.       A trigger sees that happen, so it can queue the
--                               path the moment it does.
--   2. The row never existed.   An upload that was cancelled, or whose insert
--                               failed in a way the client could not roll back
--                               (the tab closed, the network dropped). Nothing
--                               fires, so the only way to find these is to look.
--
-- Hence a queue fed by triggers AND a sweeper that reconciles the buckets
-- against the tables. Both feed the same queue, and a janitor drains it.
--
-- Why a queue rather than deleting in the trigger: removing a file is an HTTP
-- call to the storage API, which needs the service role and must not happen
-- inside the transaction that deleted the project. Deleting rows from
-- storage.objects directly is not the same thing either. It unlinks the
-- metadata and leaves the blob behind, which is the very problem being fixed.

-- ── The queue ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS storage_cleanup_queue (
  id          bigserial   PRIMARY KEY,
  bucket_id   text        NOT NULL,
  storage_path text       NOT NULL,
  -- Why this path was queued, so a surprising deletion can be traced back.
  reason      text        NOT NULL,
  queued_at   timestamptz NOT NULL DEFAULT now(),
  attempts    integer     NOT NULL DEFAULT 0,
  last_error  text,
  deleted_at  timestamptz,
  UNIQUE (bucket_id, storage_path)
);

CREATE INDEX IF NOT EXISTS idx_storage_cleanup_pending
  ON storage_cleanup_queue (queued_at) WHERE deleted_at IS NULL;

COMMENT ON TABLE storage_cleanup_queue IS
  'Files whose owning row is gone. Drained by the storage-janitor edge function; rows are kept after deletion as an audit trail.';

ALTER TABLE storage_cleanup_queue ENABLE ROW LEVEL SECURITY;

-- Nobody reads or writes this from the client. The janitor uses the service
-- role, which bypasses RLS; leaving the table with no policy is what keeps
-- everyone else out.
REVOKE ALL ON storage_cleanup_queue FROM authenticated, anon;
REVOKE ALL ON SEQUENCE storage_cleanup_queue_id_seq FROM authenticated, anon;

-- ── 1. The row went away ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_queue_storage_cleanup()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_bucket text;
BEGIN
  -- A link-only attachment (a Google Doc) has no object behind it.
  IF OLD.storage_path IS NULL OR btrim(OLD.storage_path) = '' THEN RETURN OLD; END IF;

  v_bucket := CASE TG_TABLE_NAME
                WHEN 'message_attachments' THEN 'chat-attachments'
                ELSE 'attachments'
              END;

  INSERT INTO storage_cleanup_queue (bucket_id, storage_path, reason)
  VALUES (v_bucket, OLD.storage_path, TG_TABLE_NAME || ' row deleted')
  -- Already queued (or already swept) is not a problem worth raising: the path
  -- only has to be deleted once, and a re-queue must never fail the delete that
  -- triggered it.
  ON CONFLICT (bucket_id, storage_path) DO NOTHING;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_attachments_queue_cleanup ON attachments;
CREATE TRIGGER trg_attachments_queue_cleanup
  AFTER DELETE ON attachments
  FOR EACH ROW EXECUTE FUNCTION fn_queue_storage_cleanup();

DROP TRIGGER IF EXISTS trg_message_attachments_queue_cleanup ON message_attachments;
CREATE TRIGGER trg_message_attachments_queue_cleanup
  AFTER DELETE ON message_attachments
  FOR EACH ROW EXECUTE FUNCTION fn_queue_storage_cleanup();

-- ── 2. The row never existed ─────────────────────────────────────────────────
-- The grace period is the whole point: an upload in flight has an object and no
-- row yet, and is indistinguishable from a cancelled one until enough time has
-- passed. An hour is far longer than any upload this portal accepts.
CREATE OR REPLACE FUNCTION fn_sweep_orphan_storage(p_grace interval DEFAULT interval '1 hour')
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, storage AS $$
DECLARE v_found integer;
BEGIN
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

COMMENT ON FUNCTION fn_sweep_orphan_storage(interval) IS
  'Queues files in the private buckets that no row points at. The grace period protects uploads still in flight.';

-- ── Draining it ──────────────────────────────────────────────────────────────
-- Same shape as the push hook: the URL and shared secret live in Vault, pg_net
-- makes the call, and the edge function holds the service role. Unconfigured is
-- a no-op rather than an error, so a fresh environment simply queues and waits.
CREATE OR REPLACE FUNCTION fn_request_storage_cleanup()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, vault, net AS $$
DECLARE v_url text; v_secret text; v_pending integer;
BEGIN
  SELECT count(*) INTO v_pending FROM storage_cleanup_queue WHERE deleted_at IS NULL;
  IF v_pending = 0 THEN RETURN; END IF;

  SELECT decrypted_secret INTO v_url    FROM vault.decrypted_secrets WHERE name = 'janitor_hook_url';
  SELECT decrypted_secret INTO v_secret FROM vault.decrypted_secrets WHERE name = 'janitor_hook_secret';
  IF v_url IS NULL OR v_url = '' THEN RETURN; END IF;

  PERFORM net.http_post(
    url     := v_url,
    headers := jsonb_build_object(
                 'Content-Type',     'application/json',
                 'x-janitor-secret', COALESCE(v_secret, '')
               ),
    body    := jsonb_build_object('pending', v_pending),
    timeout_milliseconds := 20000
  );
END;
$$;

-- Sweep first so anything the triggers could not see is in the queue, then ask
-- the janitor to drain it. Hourly: an orphan costs storage, not correctness, so
-- there is nothing to gain from being twitchy about it.
SELECT cron.schedule('sweep-orphan-storage', '40 * * * *',
                     $cron$SELECT fn_sweep_orphan_storage();$cron$)
 WHERE NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sweep-orphan-storage');

SELECT cron.schedule('drain-storage-cleanup', '45 * * * *',
                     $cron$SELECT fn_request_storage_cleanup();$cron$)
 WHERE NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'drain-storage-cleanup');

REVOKE ALL ON FUNCTION fn_sweep_orphan_storage(interval)  FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION fn_request_storage_cleanup()       FROM public, anon, authenticated;

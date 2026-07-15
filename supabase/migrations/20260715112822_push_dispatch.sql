-- ════════════════════════════════════════════════════════════════════
-- NOTIFICATIONS — Part 3: dispatch each notification to the send-push
-- Edge Function so it reaches the recipient's devices.
--
--  • pg_net's http_post is ASYNC — it queues the request and returns
--    immediately, so creating a notification never blocks (or fails) the
--    transaction that caused it. A leave request still saves even if push is
--    down.
--  • Config lives in Vault, not in this file, so no secret is committed. If the
--    secrets are absent the trigger is a NO-OP: the bell and realtime keep
--    working, only push is skipped. That makes push strictly additive.
-- ════════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION fn_push_notification()
RETURNS trigger AS $$
DECLARE
  v_url    text;
  v_secret text;
BEGIN
  SELECT decrypted_secret INTO v_url
    FROM vault.decrypted_secrets WHERE name = 'push_hook_url';
  SELECT decrypted_secret INTO v_secret
    FROM vault.decrypted_secrets WHERE name = 'push_hook_secret';

  -- Push not configured yet → skip quietly; the in-app bell is unaffected.
  IF v_url IS NULL OR v_url = '' THEN RETURN NULL; END IF;

  PERFORM net.http_post(
    url     := v_url,
    headers := jsonb_build_object(
                 'Content-Type',  'application/json',
                 'x-push-secret', COALESCE(v_secret, '')
               ),
    body    := jsonb_build_object('notification_id', NEW.id)
  );
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, vault, net;

-- AFTER INSERT: fn_notifications_gate() has already dropped anything the
-- recipient opted out of, so whatever reaches here is meant to be delivered.
CREATE TRIGGER trg_push_notification
  AFTER INSERT ON notifications
  FOR EACH ROW EXECUTE FUNCTION fn_push_notification();

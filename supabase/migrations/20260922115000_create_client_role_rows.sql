-- The allow-list needs entries, or it allows everything.
--
-- 20260922114000 turned is_internal() into a test of roles.is_client, but there
-- were no `roles` rows for client_owner or client_member — those two only ever
-- existed as strings in profiles.role. The UPDATE touched zero rows, so the flag
-- was false everywhere and a client user would have read as internal staff: the
-- precise failure that change was written to close.
--
-- Caught by checking how many rows the UPDATE actually touched rather than
-- assuming it had worked. No live impact: there are no client users yet.

ALTER TABLE roles DISABLE TRIGGER USER;

INSERT INTO roles (slug, name, color, position, is_system, is_default, is_hidden, is_client)
VALUES
  ('client_owner',  'Client Owner',  '#7A8597', 2, true, false, false, true),
  ('client_member', 'Client Member', '#7A8597', 1, true, false, false, true)
ON CONFLICT (slug) DO UPDATE SET is_client = true;

ALTER TABLE roles ENABLE TRIGGER USER;

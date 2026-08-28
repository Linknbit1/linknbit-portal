-- Telling people what changed.
--
-- The changelog lives in the front-end bundle, so the database has no idea a
-- release happened. That is fine for the quiet signal and not fine for the loud
-- one, so there are two, and they are deliberately different in kind:
--
--   * The quiet one is a dot on the sidebar. It needs no row and no write:
--     the client compares the newest release it was built with against
--     `profiles.last_seen_release`. Nobody is interrupted, and opening the
--     changelog clears it.
--   * The loud one is a real notification, and it is sent by a person, once,
--     for a release worth interrupting everyone over. Recording which versions
--     have been announced is what makes "once" true, and it is why this is a
--     table rather than a fire-and-forget RPC.
--
-- Additive throughout: one nullable column, one new table, two new functions.

-- ── Who may broadcast ────────────────────────────────────────────────────────
-- Its own key rather than borrowing can_manage_roles. Sending a notification to
-- every person in the company is a distinct thing to be trusted with, and a key
-- that means what it says can be given to whoever actually writes the release
-- notes without also handing them the role editor.
INSERT INTO permissions (key, label, description, category, sort_order, is_hidden)
VALUES ('can_publish_releases', 'Publish releases',
        'Announce a new release to everyone in the portal.', 'Governance', 10, false)
ON CONFLICT (key) DO NOTHING;

-- Seeded to the two roles that already carry company-wide governance. Everyone
-- else has to be granted it deliberately.
INSERT INTO role_permissions (role_id, permission_key)
SELECT r.id, 'can_publish_releases'
  FROM roles r
 WHERE r.slug IN ('super_admin', 'admin')
ON CONFLICT DO NOTHING;

-- ── What this person has already seen ────────────────────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS last_seen_release text;

COMMENT ON COLUMN profiles.last_seen_release IS
  'Newest changelog version this person has opened. Drives the unread dot; never used for access.';

-- ── What has been announced, so it cannot be announced twice ────────────────
CREATE TABLE IF NOT EXISTS release_announcements (
  version       text        PRIMARY KEY,
  title         text        NOT NULL,
  announced_by  uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  announced_at  timestamptz NOT NULL DEFAULT now(),
  recipients    integer     NOT NULL DEFAULT 0
);

ALTER TABLE release_announcements ENABLE ROW LEVEL SECURITY;

-- Readable by everyone internal: the changelog page uses it to show which
-- releases have already gone out, so nobody sends the same one twice.
DROP POLICY IF EXISTS p_release_announcements_select ON release_announcements;
CREATE POLICY p_release_announcements_select ON release_announcements FOR SELECT
  USING (is_internal());

-- Written only through announce_release(), never directly.
REVOKE INSERT, UPDATE, DELETE ON release_announcements FROM authenticated;

-- ── Clearing the dot ─────────────────────────────────────────────────────────
-- An RPC rather than a profile update so that opening the changelog cannot be
-- turned into a way to write arbitrary profile columns.
CREATE OR REPLACE FUNCTION public.mark_release_seen(p_version text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE profiles
     SET last_seen_release = p_version
   WHERE id = auth.uid()
     AND (last_seen_release IS DISTINCT FROM p_version);
$$;

COMMENT ON FUNCTION public.mark_release_seen(text) IS
  'Records that the caller has opened the changelog at this version. Clears the sidebar dot.';

-- ── Announcing one ───────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.announce_release(
  p_version text,
  p_title   text,
  p_body    text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_count integer;
BEGIN
  IF NOT has_feature('can_publish_releases') THEN
    RAISE EXCEPTION 'Not allowed to announce a release';
  END IF;
  IF length(btrim(coalesce(p_version, ''))) = 0 THEN
    RAISE EXCEPTION 'A version is required';
  END IF;
  IF EXISTS (SELECT 1 FROM release_announcements WHERE version = p_version) THEN
    RAISE EXCEPTION 'Version % has already been announced', p_version;
  END IF;

  -- Everyone internal and still with us. Clients are not told about internal
  -- releases, and a deactivated account has nobody reading it.
  INSERT INTO notifications (profile_id, type, title, body, resource_type, resource_id)
  SELECT p.id, 'release_published', p_title, p_body, 'changelog', p_version
    FROM profiles p
   WHERE p.is_active
     AND p.role NOT IN ('client_owner', 'client_member');
  GET DIAGNOSTICS v_count = ROW_COUNT;

  INSERT INTO release_announcements (version, title, announced_by, recipients)
  VALUES (p_version, p_title, auth.uid(), v_count);

  RETURN v_count;
END;
$$;

COMMENT ON FUNCTION public.announce_release(text, text, text) IS
  'Notifies every active internal user about a release, once. Refuses a version that has already gone out.';

REVOKE ALL ON FUNCTION public.mark_release_seen(text)                FROM public, anon;
REVOKE ALL ON FUNCTION public.announce_release(text, text, text)     FROM public, anon;
GRANT EXECUTE ON FUNCTION public.mark_release_seen(text)             TO authenticated;
GRANT EXECUTE ON FUNCTION public.announce_release(text, text, text)  TO authenticated;

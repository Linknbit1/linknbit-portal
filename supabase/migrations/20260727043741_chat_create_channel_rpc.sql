-- Creating a channel from the client was impossible, and the reason is subtle.
--
-- `insert(...).select()` compiles to INSERT ... RETURNING *, and Postgres runs
-- the SELECT policy over the returned row. That policy is is_channel_member(id),
-- but the creator only becomes a member on the *next* statement — so the insert
-- itself passed and the RETURNING failed with a confusing
-- "new row violates row-level security policy". A creator can't read back the
-- channel they just made until they're a member, and can't be a member until it
-- exists.
--
-- Doing the whole thing in one SECURITY DEFINER function fixes the ordering and
-- makes creation atomic: no half-created channel with nobody in it if a later
-- step fails, so the client no longer needs its manual cleanup path. Permissions
-- are checked explicitly here, because SECURITY DEFINER bypasses RLS.

CREATE OR REPLACE FUNCTION fn_create_channel(
  p_name        text,
  p_description text    DEFAULT NULL,
  p_is_private  boolean DEFAULT false,
  p_member_ids  uuid[]  DEFAULT '{}',
  p_roles       text[]  DEFAULT '{}'
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_me   uuid := auth.uid();
  v_id   uuid;
  v_role text;
BEGIN
  IF v_me IS NULL OR NOT is_internal() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF NOT has_feature('can_create_channels') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF coalesce(btrim(p_name), '') = '' THEN
    RAISE EXCEPTION 'name_required';
  END IF;

  INSERT INTO channels (kind, name, description, is_private, created_by)
  VALUES (
    'channel',
    btrim(p_name),
    nullif(btrim(coalesce(p_description, '')), ''),
    coalesce(p_is_private, false),
    v_me
  )
  RETURNING id INTO v_id;

  INSERT INTO channel_members (channel_id, profile_id, role_in_channel)
  VALUES (v_id, v_me, 'owner');

  -- Client-portal accounts can never be added: chat is internal-only.
  INSERT INTO channel_members (channel_id, profile_id, role_in_channel)
  SELECT v_id, p.id, 'member'
  FROM profiles p
  WHERE p.id = ANY(coalesce(p_member_ids, '{}'))
    AND p.id <> v_me
    AND p.is_active
    AND p.role NOT IN ('client_owner', 'client_member')
  ON CONFLICT (channel_id, profile_id) DO NOTHING;

  FOREACH v_role IN ARRAY coalesce(p_roles, '{}') LOOP
    INSERT INTO channel_roles (channel_id, role, created_by)
    VALUES (v_id, v_role, v_me)
    ON CONFLICT (channel_id, role) DO NOTHING;

    PERFORM fn_sync_channel_role(v_id, v_role);
  END LOOP;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION fn_create_channel(text, text, boolean, uuid[], text[]) FROM public, anon;
GRANT EXECUTE ON FUNCTION fn_create_channel(text, text, boolean, uuid[], text[]) TO authenticated;

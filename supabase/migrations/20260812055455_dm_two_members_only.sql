-- A 1:1 DM stays 1:1.
--
-- The UI hid "Manage members" for kind='dm', and a comment in the panel claimed
-- RLS refused the insert. It does not: p_channel_members_insert passes anyone
-- holding can_manage_all_channels, so an admin could add a third person to two
-- people's private conversation. One DM in production already has three members.
--
-- A trigger rather than a tightened policy, because the policy is not the only
-- way in — fn_get_or_create_dm is SECURITY DEFINER and bypasses RLS entirely.
-- Counting members at insert time catches every path, and still allows the two
-- rows that creation itself writes.
--
-- Group DMs and channels are untouched: growing is what they are for.

CREATE OR REPLACE FUNCTION fn_guard_dm_membership()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_kind  text;
  v_count int;
BEGIN
  SELECT kind INTO v_kind FROM channels WHERE id = NEW.channel_id;
  IF v_kind IS DISTINCT FROM 'dm' THEN
    RETURN NEW;
  END IF;

  SELECT count(*) INTO v_count FROM channel_members WHERE channel_id = NEW.channel_id;
  IF v_count >= 2 THEN
    RAISE EXCEPTION 'dm_is_two_people'
      USING HINT = 'Start a group conversation instead of adding someone to a direct message.';
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION fn_guard_dm_membership() IS
  'Refuses a third member on a kind=dm channel, whatever the caller''s permissions.';

DROP TRIGGER IF EXISTS trg_guard_dm_membership ON channel_members;
CREATE TRIGGER trg_guard_dm_membership
  BEFORE INSERT ON channel_members
  FOR EACH ROW EXECUTE FUNCTION fn_guard_dm_membership();

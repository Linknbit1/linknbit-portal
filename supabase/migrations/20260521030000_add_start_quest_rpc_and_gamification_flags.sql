-- start_quest: lets internal users enroll in or restart a repeatable quest.
-- Uses SECURITY DEFINER to bypass RLS on quest_progress (no user INSERT policy exists).
CREATE OR REPLACE FUNCTION start_quest(p_quest_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id UUID;
  v_role       TEXT;
  v_quest      RECORD;
  v_existing   RECORD;
BEGIN
  SELECT id, role INTO v_profile_id, v_role
  FROM profiles WHERE auth_id = auth.uid();

  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'profile_not_found';
  END IF;

  IF v_role IN ('client_owner', 'client_member') THEN
    RAISE EXCEPTION 'clients_cannot_take_quests';
  END IF;

  SELECT * INTO v_quest FROM quests WHERE id = p_quest_id AND is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'quest_not_found_or_inactive';
  END IF;

  SELECT * INTO v_existing FROM quest_progress
  WHERE profile_id = v_profile_id AND quest_id = p_quest_id;

  IF FOUND THEN
    IF NOT v_existing.completed THEN
      RAISE EXCEPTION 'quest_already_started';
    END IF;
    IF v_quest.repeatable THEN
      -- Reset progress for repeatable quests so user can run them again
      UPDATE quest_progress
      SET progress = 0, completed = false, completed_at = NULL
      WHERE profile_id = v_profile_id AND quest_id = p_quest_id;
    ELSE
      RAISE EXCEPTION 'quest_already_completed';
    END IF;
  ELSE
    INSERT INTO quest_progress (profile_id, quest_id, progress, completed)
    VALUES (v_profile_id, p_quest_id, 0, false);
  END IF;
END;
$$;

-- New feature flags: quest management and shoutout gating
INSERT INTO role_feature_flags (role, feature_key, enabled) VALUES
  ('super_admin',     'can_manage_quests', true),
  ('admin',           'can_manage_quests', true),
  ('project_manager', 'can_manage_quests', false),
  ('team_lead',       'can_manage_quests', false),
  ('employee',        'can_manage_quests', false),
  ('hr',              'can_manage_quests', false),
  ('finance',         'can_manage_quests', false),

  ('super_admin',     'can_give_shoutout', true),
  ('admin',           'can_give_shoutout', true),
  ('project_manager', 'can_give_shoutout', true),
  ('team_lead',       'can_give_shoutout', true),
  ('employee',        'can_give_shoutout', false),
  ('hr',              'can_give_shoutout', true),
  ('finance',         'can_give_shoutout', false)
ON CONFLICT (role, feature_key) DO NOTHING;

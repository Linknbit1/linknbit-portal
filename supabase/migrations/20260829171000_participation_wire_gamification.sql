-- Correction to 20260829170000: wire the gamification column to the switch that
-- already existed, profiles.is_restricted.
INSERT INTO participation_overrides (module_key, profile_id, is_required, note)
SELECT 'gamification', p.id, false,
       COALESCE('Migrated: ' || NULLIF(btrim(p.restricted_reason), ''), 'Migrated from profiles.is_restricted')
  FROM profiles p
 WHERE p.is_restricted
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION fn_participation_sync_legacy()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_module  text := COALESCE(NEW.module_key, OLD.module_key);
  v_profile uuid := COALESCE(NEW.profile_id, OLD.profile_id);
  v_required boolean;
BEGIN
  v_required := fn_participates(v_profile, v_module);

  IF v_module = 'attendance' THEN
    UPDATE profiles SET attendance_excluded = NOT v_required
     WHERE id = v_profile AND attendance_excluded IS DISTINCT FROM (NOT v_required);

  ELSIF v_module = 'gamification' THEN
    UPDATE profiles
       SET is_restricted     = NOT v_required,
           restricted_reason = CASE WHEN v_required THEN NULL
                                    ELSE COALESCE(NEW.note, restricted_reason) END
     WHERE id = v_profile AND is_restricted IS DISTINCT FROM (NOT v_required);

  ELSIF v_module = 'standup' THEN
    IF TG_OP = 'DELETE' THEN
      DELETE FROM standup_participants WHERE profile_id = v_profile;
    ELSE
      INSERT INTO standup_participants (profile_id, is_required, note, updated_by)
      VALUES (v_profile, NEW.is_required, NEW.note, NEW.updated_by)
      ON CONFLICT (profile_id) DO UPDATE
        SET is_required = EXCLUDED.is_required,
            note        = EXCLUDED.note,
            updated_by  = EXCLUDED.updated_by,
            updated_at  = now();
    END IF;
  END IF;

  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION fn_participation_sync_legacy() FROM public, anon, authenticated;

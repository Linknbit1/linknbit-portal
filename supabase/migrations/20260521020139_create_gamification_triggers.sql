-- ─────────────────────────────────────────
-- XP TRANSACTION TRIGGER
-- Updates profiles.xp_total on every xp_transaction INSERT.
-- fn_sync_profile_level + trg_profile_level_sync (Phase 1) fire next and recompute level.
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_apply_xp_transaction()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles
  SET xp_total = xp_total + NEW.amount
  WHERE id = NEW.profile_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_apply_xp
  AFTER INSERT ON xp_transactions
  FOR EACH ROW EXECUTE FUNCTION fn_apply_xp_transaction();

-- ─────────────────────────────────────────
-- COUNT-BASED QUEST EVALUATION (STUB)
-- Wired to the tasks table in Phase 5 (wire_quest_task_trigger migration).
-- Created here so Phase 5 can reference it without re-defining it.
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_evaluate_count_quests()
RETURNS TRIGGER AS $$
DECLARE
  v_condition_type  text;
  v_condition_count int;
  v_quest           quests%ROWTYPE;
  v_progress_row    quest_progress%ROWTYPE;
  v_new_progress    int;
BEGIN
  IF TG_TABLE_NAME = 'tasks' THEN
    IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
      v_condition_type := 'tasks_completed';
    ELSE
      RETURN NEW;
    END IF;
  ELSE
    RETURN NEW;
  END IF;

  FOR v_quest IN
    SELECT * FROM quests
    WHERE condition_type = v_condition_type AND is_active = true
  LOOP
    v_condition_count := (v_quest.condition_value->>'count')::int;

    FOR v_progress_row IN
      SELECT qp.* FROM quest_progress qp
      WHERE qp.quest_id = v_quest.id
        AND qp.completed = false
        AND EXISTS (
          SELECT 1 FROM task_assignees ta
          WHERE ta.task_id = NEW.id AND ta.profile_id = qp.profile_id
        )
    LOOP
      v_new_progress := v_progress_row.progress + 1;

      UPDATE quest_progress
      SET progress     = v_new_progress,
          completed    = (v_new_progress >= v_condition_count),
          completed_at = CASE WHEN v_new_progress >= v_condition_count THEN now() ELSE NULL END
      WHERE profile_id = v_progress_row.profile_id AND quest_id = v_quest.id;

      IF v_new_progress >= v_condition_count THEN
        INSERT INTO xp_transactions (profile_id, amount, reason)
        VALUES (v_progress_row.profile_id, v_quest.xp_reward, 'Quest completed: ' || v_quest.title);

        INSERT INTO notifications (profile_id, title, body, resource_type, resource_id)
        VALUES (
          v_progress_row.profile_id,
          'Quest Complete!',
          'You completed "' || v_quest.title || '" and earned ' || v_quest.xp_reward || ' XP.',
          'quest',
          v_quest.id::text
        );
      END IF;
    END LOOP;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

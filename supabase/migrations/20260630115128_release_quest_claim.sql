-- ════════════════════════════════════════════════════════════════════
-- Quest Board: let managers/HR release (remove) an employee's claim.
--
-- Employees can claim the wrong quest by mistake. This SECURITY DEFINER
-- RPC lets any recognizer (super_admin, admin, hr, project_manager,
-- team_lead — same gate as posting/editing/reviewing tasks) remove a
-- live claim, freeing the slot so it can be re-claimed.
--
-- Approved claims are NOT removable here: LP was already awarded, so
-- reversing one is a separate concern and must not silently drop history.
--
-- Purely additive — creates one function, no schema/data changes.
-- ════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION release_quest_claim(p_claim_id uuid)
RETURNS void AS $$
DECLARE
  v_claim quest_task_claims%ROWTYPE;
  v_task  quest_tasks%ROWTYPE;
BEGIN
  IF NOT can_recognize() THEN RAISE EXCEPTION 'forbidden'; END IF;

  SELECT * INTO v_claim FROM quest_task_claims WHERE id = p_claim_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'claim_not_found'; END IF;
  IF v_claim.status = 'approved' THEN RAISE EXCEPTION 'claim_already_approved'; END IF;

  SELECT * INTO v_task FROM quest_tasks WHERE id = v_claim.task_id;

  DELETE FROM quest_task_claims WHERE id = p_claim_id;

  INSERT INTO notifications (profile_id, title, body, resource_type, resource_id)
  VALUES (v_claim.profile_id, 'Quest Claim Removed',
          'Your claim on "' || v_task.title || '" was removed by a manager. You can claim it again if it''s still open.',
          'quest_task', v_task.id::text);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ════════════════════════════════════════════════════════════════════
-- GAMIFICATION REDESIGN — Part 2: Quest Board (claimable task system)
-- Replaces the old condition-based achievement quests with the policy's
-- claim → complete → submit proof → HR/Manager approve → LP awarded flow.
-- ════════════════════════════════════════════════════════════════════

-- ── Drop the old achievement-quest system ───────────────────────────────────────
DROP FUNCTION IF EXISTS start_quest(uuid);
DROP FUNCTION IF EXISTS fn_evaluate_count_quests() CASCADE;
DROP TABLE IF EXISTS quest_progress;
DROP TABLE IF EXISTS quests;

-- ── Quest Board: tasks posted by managers/HR ────────────────────────────────────
CREATE TABLE quest_tasks (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title          text        NOT NULL,
  description    text,
  difficulty     text        NOT NULL CHECK (difficulty IN ('easy','medium','hard')),
  lp_value       int         NOT NULL CHECK (lp_value > 0),
  max_claims     int         NOT NULL DEFAULT 1 CHECK (max_claims >= 1),  -- approvals allowed
  requires_proof boolean     NOT NULL DEFAULT true,
  deadline       timestamptz,
  status         text        NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
  created_by     uuid        REFERENCES profiles(id),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE quest_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY p_quest_tasks_select ON quest_tasks FOR SELECT
  USING (is_internal());

CREATE POLICY p_quest_tasks_write ON quest_tasks FOR ALL
  USING     (can_recognize())
  WITH CHECK (can_recognize());

-- ── Claims: an employee taking a task, then submitting proof for review ──────────
CREATE TABLE quest_task_claims (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id      uuid        NOT NULL REFERENCES quest_tasks(id) ON DELETE CASCADE,
  profile_id   uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status       text        NOT NULL DEFAULT 'claimed'
                 CHECK (status IN ('claimed','submitted','approved','rejected','expired')),
  proof_url    text,
  proof_note   text,
  lp_awarded   int,
  claimed_at   timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  reviewed_by  uuid        REFERENCES profiles(id),
  reviewed_at  timestamptz,
  review_note  text
);

-- A user may hold only one live claim per task; re-claiming is allowed after rejection/expiry.
CREATE UNIQUE INDEX uq_quest_claim_active ON quest_task_claims(task_id, profile_id)
  WHERE status IN ('claimed','submitted','approved');

CREATE INDEX idx_quest_claims_profile ON quest_task_claims(profile_id, status);
CREATE INDEX idx_quest_claims_task    ON quest_task_claims(task_id, status);

ALTER TABLE quest_task_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY p_quest_claims_own ON quest_task_claims FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY p_quest_claims_reviewer ON quest_task_claims FOR SELECT
  USING (can_recognize());
-- All writes happen through SECURITY DEFINER RPCs below.

-- ── RPC: claim a task ───────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION claim_quest_task(p_task_id uuid)
RETURNS uuid AS $$
DECLARE
  v_me        uuid := auth.uid();
  v_task      quest_tasks%ROWTYPE;
  v_restricted boolean;
  v_live      int;
  v_claim_id  uuid;
BEGIN
  SELECT is_restricted INTO v_restricted FROM profiles WHERE id = v_me;
  IF v_restricted THEN RAISE EXCEPTION 'participation_restricted'; END IF;

  SELECT * INTO v_task FROM quest_tasks WHERE id = p_task_id FOR UPDATE;
  IF NOT FOUND OR v_task.status <> 'open' THEN RAISE EXCEPTION 'task_unavailable'; END IF;
  IF v_task.deadline IS NOT NULL AND v_task.deadline < now() THEN RAISE EXCEPTION 'task_expired'; END IF;

  -- Capacity: count claims that still occupy a slot (live or already approved).
  SELECT count(*) INTO v_live FROM quest_task_claims
  WHERE task_id = p_task_id AND status IN ('claimed','submitted','approved');
  IF v_live >= v_task.max_claims THEN RAISE EXCEPTION 'task_full'; END IF;

  INSERT INTO quest_task_claims (task_id, profile_id)
  VALUES (p_task_id, v_me)
  RETURNING id INTO v_claim_id;
  RETURN v_claim_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ── RPC: submit proof for a claimed task ────────────────────────────────────────
CREATE OR REPLACE FUNCTION submit_quest_task(
  p_claim_id uuid, p_proof_url text DEFAULT NULL, p_proof_note text DEFAULT NULL
) RETURNS void AS $$
DECLARE
  v_claim quest_task_claims%ROWTYPE;
  v_task  quest_tasks%ROWTYPE;
BEGIN
  SELECT * INTO v_claim FROM quest_task_claims WHERE id = p_claim_id FOR UPDATE;
  IF NOT FOUND OR v_claim.profile_id <> auth.uid() THEN RAISE EXCEPTION 'claim_not_found'; END IF;
  IF v_claim.status <> 'claimed' THEN RAISE EXCEPTION 'claim_not_submittable'; END IF;

  SELECT * INTO v_task FROM quest_tasks WHERE id = v_claim.task_id;
  IF v_task.requires_proof AND COALESCE(p_proof_url, p_proof_note) IS NULL THEN
    RAISE EXCEPTION 'proof_required';
  END IF;

  UPDATE quest_task_claims
  SET status = 'submitted', proof_url = p_proof_url, proof_note = p_proof_note, submitted_at = now()
  WHERE id = p_claim_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ── RPC: review a submitted task (approve = award LP, reject = send back) ────────
CREATE OR REPLACE FUNCTION review_quest_task(
  p_claim_id uuid, p_approve boolean, p_note text DEFAULT NULL
) RETURNS void AS $$
DECLARE
  v_claim quest_task_claims%ROWTYPE;
  v_task  quest_tasks%ROWTYPE;
BEGIN
  IF NOT can_recognize() THEN RAISE EXCEPTION 'forbidden'; END IF;

  SELECT * INTO v_claim FROM quest_task_claims WHERE id = p_claim_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'claim_not_found'; END IF;
  IF v_claim.status <> 'submitted' THEN RAISE EXCEPTION 'claim_not_reviewable'; END IF;
  IF v_claim.profile_id = auth.uid() THEN RAISE EXCEPTION 'cannot_review_own'; END IF;

  SELECT * INTO v_task FROM quest_tasks WHERE id = v_claim.task_id;

  IF p_approve THEN
    UPDATE quest_task_claims
    SET status = 'approved', reviewed_by = auth.uid(), reviewed_at = now(),
        review_note = p_note, lp_awarded = v_task.lp_value
    WHERE id = p_claim_id;

    INSERT INTO xp_transactions (profile_id, amount, reason, granted_by)
    VALUES (v_claim.profile_id, v_task.lp_value, 'Task approved: ' || v_task.title, auth.uid());

    INSERT INTO notifications (profile_id, title, body, resource_type, resource_id)
    VALUES (v_claim.profile_id, 'Task Approved',
            'Your task "' || v_task.title || '" was approved — +' || v_task.lp_value || ' LP.',
            'quest_task', v_task.id::text);
  ELSE
    UPDATE quest_task_claims
    SET status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now(), review_note = p_note
    WHERE id = p_claim_id;

    INSERT INTO notifications (profile_id, title, body, resource_type, resource_id)
    VALUES (v_claim.profile_id, 'Task Needs Rework',
            'Your submission for "' || v_task.title || '" was not approved.'
            || COALESCE(' Note: ' || p_note, ''),
            'quest_task', v_task.id::text);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

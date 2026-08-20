-- ════════════════════════════════════════════════════════════════════
-- Gamification: tell the reviewers something is waiting.
--
-- Until now gamification only notified the *subject* of a decision ("your task
-- was approved", "you got a shoutout"). Nothing told the people who make those
-- decisions that a queue had filled up, so a submitted quest or a redemption sat
-- unseen until somebody happened to open the page.
--
-- Three events now reach the reviewers, each addressed by capability rather than
-- by role name, so the permission editor stays the single source of truth:
--   quest proof submitted  → can_recognize
--   shoutout given         → can_govern_gamification
--   reward redeemed / pool filled → can_fulfill_payouts
--
-- Each carries its own preference key, so a reviewer can mute one queue without
-- losing the others (see NOTIFICATION_GROUPS in src/constants/notifications.ts).
-- ════════════════════════════════════════════════════════════════════

-- ── Recipient set: everyone holding a permission ────────────────────────────────
-- Mirrors has_feature() (including the 'administrator' wildcard) but for an
-- arbitrary profile instead of the caller. Inactive profiles are excluded — a
-- departed governor must not keep collecting review notices.
CREATE OR REPLACE FUNCTION fn_staff_with_permission(p_key text)
RETURNS TABLE (profile_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT DISTINCT pr.profile_id
    FROM profile_roles pr
    JOIN role_permissions rp ON rp.role_id = pr.role_id
    JOIN profiles p          ON p.id = pr.profile_id
   WHERE p.is_active
     AND rp.permission_key IN (p_key, 'administrator');
$$;

REVOKE ALL ON FUNCTION fn_staff_with_permission(text) FROM public;
REVOKE ALL ON FUNCTION fn_staff_with_permission(text) FROM anon;

-- ── 1. Quest proof submitted → reviewers ────────────────────────────────────────
-- On the status change rather than inside submit_quest_task(), so any writer
-- (RPC, admin fix-up) produces the same notice.
CREATE OR REPLACE FUNCTION fn_notify_quest_submitted()
RETURNS trigger AS $$
DECLARE v_name text; v_title text;
BEGIN
  SELECT name  INTO v_name  FROM profiles    WHERE id = NEW.profile_id;
  SELECT title INTO v_title FROM quest_tasks WHERE id = NEW.task_id;

  PERFORM fn_notify(r.profile_id, 'quest_submitted', 'Quest awaiting review',
                    COALESCE(v_name, 'Someone') || ' submitted "'
                      || COALESCE(v_title, 'a quest') || '" for review',
                    'quest_task', NEW.task_id::text, NEW.profile_id)
  FROM fn_staff_with_permission('can_recognize') r;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_notify_quest_submitted ON quest_task_claims;
CREATE TRIGGER trg_notify_quest_submitted AFTER UPDATE OF status ON quest_task_claims
  FOR EACH ROW WHEN (OLD.status IS DISTINCT FROM 'submitted' AND NEW.status = 'submitted')
  EXECUTE FUNCTION fn_notify_quest_submitted();

-- ── 2. Shoutout given → governors ───────────────────────────────────────────────
-- Shoutouts are always created pending; the giver may be a team lead who cannot
-- approve their own, which is exactly why the governors need telling.
CREATE OR REPLACE FUNCTION fn_notify_shoutout_pending()
RETURNS trigger AS $$
DECLARE v_from text; v_to text;
BEGIN
  SELECT name INTO v_from FROM profiles WHERE id = NEW.from_profile_id;
  SELECT name INTO v_to   FROM profiles WHERE id = NEW.to_profile_id;

  PERFORM fn_notify(r.profile_id, 'shoutout_pending', 'Shoutout awaiting review',
                    COALESCE(v_from, 'Someone') || ' recognised ' || COALESCE(v_to, 'a colleague')
                      || ' — ' || NEW.category || ' (+' || NEW.lp_value || ' XP)',
                    'shoutout', NEW.id::text, NEW.from_profile_id)
  FROM fn_staff_with_permission('can_govern_gamification') r;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_notify_shoutout_pending ON shoutouts;
CREATE TRIGGER trg_notify_shoutout_pending AFTER INSERT ON shoutouts
  FOR EACH ROW WHEN (NEW.status = 'pending')
  EXECUTE FUNCTION fn_notify_shoutout_pending();

-- ── 3. Reward redeemed → whoever fulfils payouts ────────────────────────────────
CREATE OR REPLACE FUNCTION fn_notify_redemption_pending()
RETURNS trigger AS $$
DECLARE v_name text; v_reward text;
BEGIN
  SELECT name INTO v_name   FROM profiles WHERE id = NEW.profile_id;
  SELECT name INTO v_reward FROM rewards  WHERE id = NEW.reward_id;

  PERFORM fn_notify(r.profile_id, 'redemption_pending', 'Reward redeemed',
                    COALESCE(v_name, 'Someone') || ' redeemed "'
                      || COALESCE(v_reward, 'a reward') || '" — ' || NEW.xp_spent || ' XP',
                    'redemption', NEW.id::text, NEW.profile_id)
  FROM fn_staff_with_permission('can_fulfill_payouts') r;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_notify_redemption_pending ON reward_redemptions;
CREATE TRIGGER trg_notify_redemption_pending AFTER INSERT ON reward_redemptions
  FOR EACH ROW WHEN (NEW.status = 'pending')
  EXECUTE FUNCTION fn_notify_redemption_pending();

-- ── 4. Group pool filled → whoever fulfils payouts ──────────────────────────────
-- A pool only becomes reviewable when the last member joins and it flips to
-- 'pending', so that transition is the event, not the pool being opened.
CREATE OR REPLACE FUNCTION fn_notify_pool_pending()
RETURNS trigger AS $$
DECLARE v_reward text; v_members int;
BEGIN
  SELECT name INTO v_reward FROM rewards WHERE id = NEW.reward_id;
  SELECT count(*) INTO v_members FROM reward_pool_members WHERE pool_id = NEW.id;

  PERFORM fn_notify(r.profile_id, 'redemption_pending', 'Group reward filled',
                    v_members || ' people pooled for "' || COALESCE(v_reward, 'a reward')
                      || '" — ' || (NEW.per_person_lp * NEW.group_size) || ' XP total',
                    'reward_pool', NEW.id::text, auth.uid())
  FROM fn_staff_with_permission('can_fulfill_payouts') r;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_notify_pool_pending ON reward_pools;
CREATE TRIGGER trg_notify_pool_pending AFTER UPDATE OF status ON reward_pools
  FOR EACH ROW WHEN (OLD.status IS DISTINCT FROM 'pending' AND NEW.status = 'pending')
  EXECUTE FUNCTION fn_notify_pool_pending();

-- ── 5. Sidebar badge: one round-trip instead of four queue queries ──────────────
-- Counts only what the CALLER can act on, so the number beside "Approvals"
-- always matches the queues they will actually see on the page.
CREATE OR REPLACE FUNCTION gamification_pending_count()
RETURNS integer
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_total int := 0;
BEGIN
  IF has_feature('can_recognize') THEN
    v_total := v_total + (SELECT count(*) FROM quest_task_claims WHERE status = 'submitted');
  END IF;
  IF has_feature('can_govern_gamification') THEN
    v_total := v_total + (SELECT count(*) FROM shoutouts WHERE status = 'pending');
  END IF;
  IF has_feature('can_fulfill_payouts') THEN
    v_total := v_total + (SELECT count(*) FROM reward_redemptions WHERE status IN ('pending','approved'));
    v_total := v_total + (SELECT count(*) FROM reward_pools       WHERE status IN ('pending','approved'));
  END IF;
  RETURN v_total;
END;
$$;

REVOKE ALL ON FUNCTION gamification_pending_count() FROM public;
REVOKE ALL ON FUNCTION gamification_pending_count() FROM anon;
GRANT EXECUTE ON FUNCTION gamification_pending_count() TO authenticated;

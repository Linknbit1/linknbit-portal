-- ════════════════════════════════════════════════════════════════════
-- GAMIFICATION REDESIGN — Part 5: Badges (real, auto-awarded)
-- Replaces the mock badge data with a backed catalog + automatic awards
-- on reputation milestones, approved-task counts, and shoutouts received.
-- ════════════════════════════════════════════════════════════════════

CREATE TABLE badges (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name           text        NOT NULL,
  description    text,
  icon           text        NOT NULL DEFAULT '🏅',
  category       text        NOT NULL CHECK (category IN ('milestone','consistency','team','service','special')),
  criteria_type  text        NOT NULL CHECK (criteria_type IN ('reputation_total','tasks_approved','shoutouts_received','manual')),
  criteria_value int         NOT NULL DEFAULT 0,
  is_active      boolean     NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE badge_awards (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  badge_id   uuid        NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  profile_id uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  awarded_at timestamptz NOT NULL DEFAULT now(),
  awarded_by uuid        REFERENCES profiles(id),
  UNIQUE (badge_id, profile_id)
);

CREATE INDEX idx_badge_awards_profile ON badge_awards(profile_id);

ALTER TABLE badges       ENABLE ROW LEVEL SECURITY;
ALTER TABLE badge_awards ENABLE ROW LEVEL SECURITY;

CREATE POLICY p_badges_select ON badges FOR SELECT USING (is_internal());
CREATE POLICY p_badges_write  ON badges FOR ALL
  USING (can_govern_gamification()) WITH CHECK (can_govern_gamification());

-- Badge awards are public recognition among internal staff.
CREATE POLICY p_badge_awards_select ON badge_awards FOR SELECT USING (is_internal());

-- ── Auto-award evaluation ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_award_badges(p_profile_id uuid)
RETURNS void AS $$
DECLARE
  v_rep    int;
  v_tasks  int;
  v_shouts int;
  b        badges%ROWTYPE;
  v_hit    boolean;
BEGIN
  SELECT reputation_total INTO v_rep FROM profiles WHERE id = p_profile_id;
  SELECT count(*) INTO v_tasks  FROM quest_task_claims WHERE profile_id = p_profile_id AND status = 'approved';
  SELECT count(*) INTO v_shouts FROM shoutouts        WHERE to_profile_id = p_profile_id AND status = 'approved';

  FOR b IN SELECT * FROM badges WHERE is_active AND criteria_type <> 'manual' LOOP
    v_hit := (b.criteria_type = 'reputation_total'   AND v_rep    >= b.criteria_value)
          OR (b.criteria_type = 'tasks_approved'     AND v_tasks  >= b.criteria_value)
          OR (b.criteria_type = 'shoutouts_received' AND v_shouts >= b.criteria_value);
    IF v_hit THEN
      INSERT INTO badge_awards (badge_id, profile_id) VALUES (b.id, p_profile_id)
      ON CONFLICT (badge_id, profile_id) DO NOTHING;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Re-check badges whenever a positive points transaction lands (task/shoutout/grant/attendance).
-- Fires after trg_apply_xp (alphabetical order) so balances are already current.
CREATE OR REPLACE FUNCTION fn_xp_badge_check()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.amount > 0 THEN
    PERFORM fn_award_badges(NEW.profile_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_xp_badge
  AFTER INSERT ON xp_transactions
  FOR EACH ROW EXECUTE FUNCTION fn_xp_badge_check();

-- ── Manual award (HR/Admin) ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION award_badge(p_badge_id uuid, p_profile_id uuid)
RETURNS void AS $$
BEGIN
  IF NOT can_govern_gamification() THEN RAISE EXCEPTION 'forbidden'; END IF;
  INSERT INTO badge_awards (badge_id, profile_id, awarded_by)
  VALUES (p_badge_id, p_profile_id, auth.uid())
  ON CONFLICT (badge_id, profile_id) DO NOTHING;

  INSERT INTO notifications (profile_id, title, body, resource_type, resource_id)
  VALUES (p_profile_id, 'Badge Earned! 🏅',
          'You were awarded the "' || (SELECT name FROM badges WHERE id = p_badge_id) || '" badge.',
          'badge', p_badge_id::text);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ── Seed catalog ────────────────────────────────────────────────────────────────
INSERT INTO badges (name, description, icon, category, criteria_type, criteria_value) VALUES
  ('First Steps',          'Earn your first 100 reputation points.',                  '👟', 'milestone',   'reputation_total',   100),
  ('Rising Star',          'Reach 1,200 reputation points.',                          '⭐', 'milestone',   'reputation_total',  1200),
  ('Veteran',              'Reach 7,500 reputation points.',                          '🎖️', 'milestone',   'reputation_total',  7500),
  ('Legend',               'Reach 24,000 reputation points.',                         '👑', 'milestone',   'reputation_total', 24000),
  ('Task Starter',         'Get 5 quest tasks approved.',                             '✅', 'consistency', 'tasks_approved',       5),
  ('Task Machine',         'Get 25 quest tasks approved.',                            '⚙️', 'consistency', 'tasks_approved',      25),
  ('Team Favorite',        'Receive 3 approved shoutouts.',                           '💛', 'team',        'shoutouts_received',   3),
  ('Celebrated',           'Receive 10 approved shoutouts.',                          '🌟', 'team',        'shoutouts_received',  10),
  ('Employee of the Month','Awarded by HR for outstanding monthly performance.',      '🏆', 'special',     'manual',               0);

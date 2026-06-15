-- Employee of the Month — a real, recurring award (one winner per calendar month),
-- visible to all internal staff, set by gamification governors (HR / admins).
-- The pre-existing manual "Employee of the Month" badge is granted to the winner
-- so it also shows in their badge collection.

CREATE TABLE employee_of_the_month (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  year        int         NOT NULL,
  month       int         NOT NULL CHECK (month BETWEEN 1 AND 12),
  profile_id  uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  note        text,
  awarded_by  uuid        REFERENCES profiles(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (year, month)
);

CREATE INDEX idx_eotm_period ON employee_of_the_month(year, month);

ALTER TABLE employee_of_the_month ENABLE ROW LEVEL SECURITY;

-- Everyone internal can see the winners.
CREATE POLICY p_eotm_select ON employee_of_the_month FOR SELECT USING (is_internal());
-- Only gamification governors (super_admin / admin / hr) can set/change winners.
CREATE POLICY p_eotm_write ON employee_of_the_month FOR ALL
  USING (can_govern_gamification()) WITH CHECK (can_govern_gamification());

-- ── Set (or replace) the winner for a month ─────────────────────────────────────
CREATE OR REPLACE FUNCTION set_employee_of_the_month(
  p_year       int,
  p_month      int,
  p_profile_id uuid,
  p_note       text DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  v_badge_id uuid;
BEGIN
  IF NOT can_govern_gamification() THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF p_month < 1 OR p_month > 12 THEN RAISE EXCEPTION 'invalid_month'; END IF;

  INSERT INTO employee_of_the_month (year, month, profile_id, note, awarded_by)
  VALUES (p_year, p_month, p_profile_id, p_note, auth.uid())
  ON CONFLICT (year, month) DO UPDATE
    SET profile_id = EXCLUDED.profile_id,
        note       = EXCLUDED.note,
        awarded_by = EXCLUDED.awarded_by,
        updated_at = now();

  -- Grant the standing "Employee of the Month" badge to the winner (one per person).
  SELECT id INTO v_badge_id FROM badges WHERE name = 'Employee of the Month' LIMIT 1;
  IF v_badge_id IS NOT NULL THEN
    INSERT INTO badge_awards (badge_id, profile_id, awarded_by)
    VALUES (v_badge_id, p_profile_id, auth.uid())
    ON CONFLICT (badge_id, profile_id) DO NOTHING;
  END IF;

  INSERT INTO notifications (profile_id, title, body, resource_type, resource_id)
  VALUES (p_profile_id, 'Employee of the Month! 🏆',
          'You were named Employee of the Month for ' ||
            to_char(make_date(p_year, p_month, 1), 'FMMonth YYYY') || '.',
          'employee_of_the_month', (p_year * 100 + p_month)::text);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

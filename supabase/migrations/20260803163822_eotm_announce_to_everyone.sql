-- Employee of the Month is an announcement, not a private award. Until now only
-- the winner was notified, so nobody else learned who it was unless they happened
-- to open Gamification → Leaderboard.
--
-- Now: the winner still gets their personal "you were named" notification, and
-- every other internal staff member gets an announcement. The two are separate
-- preference types so someone can mute the company announcement without also
-- muting the notification that they themselves won.
--
-- Re-running the setter with the SAME winner (fixing a typo in the citation, say)
-- does not re-announce — only an actual change of winner does.

CREATE OR REPLACE FUNCTION set_employee_of_the_month(
  p_year       int,
  p_month      int,
  p_profile_id uuid,
  p_note       text DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  v_prev   uuid;
  v_winner text;
  v_period text;
  v_res_id text;
BEGIN
  IF NOT can_govern_gamification() THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF p_month < 1 OR p_month > 12 THEN RAISE EXCEPTION 'invalid_month'; END IF;

  SELECT profile_id INTO v_prev
  FROM employee_of_the_month
  WHERE year = p_year AND month = p_month;

  INSERT INTO employee_of_the_month (year, month, profile_id, note, awarded_by)
  VALUES (p_year, p_month, p_profile_id, p_note, auth.uid())
  ON CONFLICT (year, month) DO UPDATE
    SET profile_id = EXCLUDED.profile_id,
        note       = EXCLUDED.note,
        awarded_by = EXCLUDED.awarded_by,
        updated_at = now();

  -- Editing the citation on an unchanged winner is not news.
  IF v_prev IS NOT DISTINCT FROM p_profile_id THEN
    RETURN;
  END IF;

  v_period := to_char(make_date(p_year, p_month, 1), 'FMMonth YYYY');
  v_res_id := (p_year * 100 + p_month)::text;
  SELECT name INTO v_winner FROM profiles WHERE id = p_profile_id;
  v_winner := COALESCE(v_winner, 'Someone');

  -- The winner. Actor is left NULL so a governor who names themselves still
  -- hears about it (fn_notify suppresses self-notifications otherwise).
  PERFORM fn_notify(
    p_profile_id,
    'gamification_eotm',
    'Employee of the Month! 🏆',
    'You were named Employee of the Month for ' || v_period || '.',
    'employee_of_the_month',
    v_res_id,
    NULL
  );

  -- Everyone else internal.
  PERFORM fn_notify(
    s.profile_id,
    'gamification_eotm_announced',
    'Employee of the Month 🏆',
    v_winner || ' is Employee of the Month for ' || v_period || '.',
    'employee_of_the_month',
    v_res_id,
    auth.uid()
  )
  FROM fn_all_internal_staff() s
  WHERE s.profile_id <> p_profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

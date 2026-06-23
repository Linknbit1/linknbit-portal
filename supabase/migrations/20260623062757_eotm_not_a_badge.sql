-- Employee of the Month is its own first-class award, not a badge. Stop granting the
-- "Employee of the Month" badge when a winner is set, add a delete RPC so governors can
-- remove a wrongly-chosen winner, and drop the badge from the catalog (cascades its
-- awards) so there is a single way to manage EOTM.

-- 1. Re-create the setter without the badge-granting block.
CREATE OR REPLACE FUNCTION set_employee_of_the_month(
  p_year       int,
  p_month      int,
  p_profile_id uuid,
  p_note       text DEFAULT NULL
)
RETURNS void AS $$
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

  INSERT INTO notifications (profile_id, title, body, resource_type, resource_id)
  VALUES (p_profile_id, 'Employee of the Month! 🏆',
          'You were named Employee of the Month for ' ||
            to_char(make_date(p_year, p_month, 1), 'FMMonth YYYY') || '.',
          'employee_of_the_month', (p_year * 100 + p_month)::text);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Delete a month's winner (e.g. chosen by mistake).
CREATE OR REPLACE FUNCTION delete_employee_of_the_month(p_year int, p_month int)
RETURNS void AS $$
BEGIN
  IF NOT can_govern_gamification() THEN RAISE EXCEPTION 'forbidden'; END IF;
  DELETE FROM employee_of_the_month WHERE year = p_year AND month = p_month;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Remove the EOTM badge from the catalog (badge_awards cascade on delete).
DELETE FROM badges WHERE name = 'Employee of the Month';

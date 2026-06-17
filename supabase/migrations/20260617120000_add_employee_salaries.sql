-- Per-employee salary, kept in a SEPARATE table (not on profiles) so row-level
-- security can restrict visibility: a salary row is readable/writable only by the
-- employee themselves or by HR/admin. profiles.* is broadly readable, so salary
-- cannot live there without leaking.

CREATE TABLE employee_salaries (
  profile_id  uuid          PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  amount      numeric(12,2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
  currency    text          NOT NULL DEFAULT 'PKR',
  updated_by  uuid          REFERENCES profiles(id) ON DELETE SET NULL,
  updated_at  timestamptz   NOT NULL DEFAULT now()
);

ALTER TABLE employee_salaries ENABLE ROW LEVEL SECURITY;

-- Visible to the owner and to HR/admin only.
CREATE POLICY p_salary_select ON employee_salaries
  FOR SELECT USING (
    profile_id = auth.uid()
    OR current_user_role() IN ('super_admin', 'admin', 'hr')
  );

-- The owner can set their own salary; HR/admin can set anyone's.
CREATE POLICY p_salary_insert ON employee_salaries
  FOR INSERT WITH CHECK (
    profile_id = auth.uid()
    OR current_user_role() IN ('super_admin', 'admin', 'hr')
  );

CREATE POLICY p_salary_update ON employee_salaries
  FOR UPDATE USING (
    profile_id = auth.uid()
    OR current_user_role() IN ('super_admin', 'admin', 'hr')
  ) WITH CHECK (
    profile_id = auth.uid()
    OR current_user_role() IN ('super_admin', 'admin', 'hr')
  );

-- Stamp audit fields server-side so they can't be spoofed by the client.
CREATE OR REPLACE FUNCTION fn_salary_set_audit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.updated_by := auth.uid();
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_salary_audit
  BEFORE INSERT OR UPDATE ON employee_salaries
  FOR EACH ROW EXECUTE FUNCTION fn_salary_set_audit();

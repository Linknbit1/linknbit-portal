-- Working Saturdays — specific Saturdays that override the default weekend off
-- DB enforces the date must be a Saturday (DOW = 6)
CREATE TABLE working_saturdays (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  date       date        NOT NULL UNIQUE CHECK (EXTRACT(DOW FROM date) = 6),
  note       text,
  created_by uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE working_saturdays ENABLE ROW LEVEL SECURITY;

CREATE POLICY p_working_sat_select ON working_saturdays
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY p_working_sat_insert ON working_saturdays
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin', 'hr'))
  );

CREATE POLICY p_working_sat_delete ON working_saturdays
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin', 'hr'))
  );

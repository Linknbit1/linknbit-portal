-- RLS for levels table — readable by all authenticated users, writable only by super_admin
ALTER TABLE levels ENABLE ROW LEVEL SECURITY;

CREATE POLICY p_levels_read ON levels FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY p_levels_admin_write ON levels FOR ALL
  USING  (current_user_role() = 'super_admin')
  WITH CHECK (current_user_role() = 'super_admin');

-- Auto-create a profile row whenever a new user is added to auth.users.
-- Covers both admin-created invites and direct signups.
-- name falls back to the local part of the email when no display name is provided.
CREATE OR REPLACE FUNCTION fn_handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    'employee'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION fn_handle_new_user();

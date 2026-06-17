-- Surface each user's auth lifecycle on their profile so the People page can show an
-- account status (Invited → Verified → Onboarded) and offer a re-send invite.
-- The source of truth lives in auth.users; we mirror the three timestamps down to
-- public.profiles via a trigger (the project already triggers on auth.users — see
-- trg_on_auth_user_created in 20260519000006).

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS invited_at         timestamptz,
  ADD COLUMN IF NOT EXISTS email_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_sign_in_at    timestamptz;

CREATE OR REPLACE FUNCTION fn_sync_auth_status()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles
     SET invited_at         = NEW.invited_at,
         email_confirmed_at = NEW.email_confirmed_at,
         last_sign_in_at    = NEW.last_sign_in_at
   WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Named to sort AFTER trg_on_auth_user_created so on INSERT the profile row created
-- by fn_handle_new_user already exists when this UPDATE runs.
DROP TRIGGER IF EXISTS trg_sync_auth_status ON auth.users;
CREATE TRIGGER trg_sync_auth_status
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION fn_sync_auth_status();

-- Backfill existing users.
UPDATE public.profiles p
   SET invited_at         = u.invited_at,
       email_confirmed_at = u.email_confirmed_at,
       last_sign_in_at    = u.last_sign_in_at
  FROM auth.users u
 WHERE u.id = p.id;

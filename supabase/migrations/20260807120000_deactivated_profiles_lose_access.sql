-- Deactivating someone means they have left the company. Until now it only
-- blocked the password login screen (auth-signin checks is_active) — everything
-- behind that door stayed open:
--   * an already-signed-in session kept working, and renewed itself off the
--     30-day refresh cookie indefinitely;
--   * RLS never consulted is_active, so that session could still read and write
--     the whole portal.
--
-- The gate belongs in the two functions every policy already routes through, so
-- a departed employee loses access everywhere at once instead of table by table:
--
--   is_internal()  — 59 policies. "Am I internal staff?" -> now also "am I still here?"
--   has_feature()  — the permission check, incl. SECURITY DEFINER admin RPCs that
--                    bypass RLS entirely. Without it a deactivated admin could
--                    still invoke privileged RPCs with a live token.
--
-- Both read `WHERE id = auth.uid()`, i.e. they describe the CALLER, never the
-- row being read. So this removes a departed person's own access and changes
-- nothing about who can be seen: their name still resolves on old chat messages,
-- completed tasks, past attendance and audit entries. Deliberate — that history
-- is payroll and audit evidence, and blanking it out would look like corruption.
--
-- p_profiles_own (id = auth.uid()) is untouched, so a deactivated user can still
-- read their own row. auth-signin depends on that to tell them why they are
-- locked out, and the client needs it for the auto-logout below.

CREATE OR REPLACE FUNCTION public.is_internal()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT is_active AND role NOT IN ('client_owner', 'client_member')
  FROM profiles WHERE id = auth.uid()
$function$;

CREATE OR REPLACE FUNCTION public.has_feature(p_key text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  select exists (
    select 1
    from profile_roles pr
    join role_permissions rp on rp.role_id = pr.role_id
    join profiles p on p.id = pr.profile_id
    where pr.profile_id = auth.uid()
      and p.is_active
      and rp.permission_key in (p_key, 'administrator')
  );
$function$;

-- Realtime on profiles: the client subscribes to its OWN row (filter id=eq.<uid>)
-- so a deactivation logs that person out within seconds rather than whenever
-- their access token next expires. The publication is table-wide because that is
-- the only granularity Postgres offers, but each subscriber still only receives
-- rows RLS lets them SELECT, narrowed further by the per-subscription filter.
--
-- Guarded: adding a table already in the publication is an error, and this is
-- exactly the kind of thing a later migration might also do.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
     WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'profiles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  END IF;
END
$$;

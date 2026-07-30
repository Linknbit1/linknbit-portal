-- Terminal liveness for ordinary members.
--
-- biometric_terminals is readable only with can_view_all_attendance, and RLS is
-- row-level: granting employees SELECT on the table would also expose
-- secret_hash. This RPC returns the three non-sensitive fields the check-in card
-- needs so an on-site member can be told "use the terminal" — or, when the relay
-- is down, be given the portal button back.

CREATE OR REPLACE FUNCTION public.get_terminal_status()
RETURNS TABLE (name text, location text, last_heartbeat_at timestamptz)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT t.name, t.location, t.last_heartbeat_at
    FROM biometric_terminals t
   WHERE t.is_active
     AND auth.uid() IS NOT NULL
   ORDER BY t.last_heartbeat_at DESC NULLS LAST;
$$;

REVOKE ALL ON FUNCTION public.get_terminal_status() FROM anon;
